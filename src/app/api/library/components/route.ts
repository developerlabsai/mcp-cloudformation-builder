import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { syncComponentToScaffold } from '@/lib/scaffold-sync';
import { logAuditEvent } from '@/lib/audit';
import { validateComponent, type QualityStatus } from '@/lib/component-validator';

/**
 * Component Library API
 *
 * POST /api/library/components - Register and auto-sync a component to scaffold
 * GET /api/library/components - List all registered components
 *
 * Components are validated and auto-fixed before saving:
 * - Code is formatted with Prettier
 * - Missing 'use client' directives are added for client components
 * - Syntax errors are detected and reported
 * - Quality status tracks: passed | auto_fixed | needs_review | failed
 */

export interface ComponentRegistration {
  name: string;
  description: string;
  category: 'ui' | 'backend' | 'api' | 'utility' | 'hook' | 'provider';
  code: string;
  filePath: string;
  dependencies: string[];
  tags: string[];
  usage?: string;
  skipValidation?: boolean; // Optional: skip validation for trusted sources
}

/**
 * POST - Register a new component and sync to scaffold
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: ComponentRegistration = await request.json();

    // Validate required fields
    const required = ['name', 'description', 'category', 'code', 'filePath', 'tags'];
    for (const field of required) {
      if (!body[field as keyof ComponentRegistration]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    // Validate and auto-fix component code
    let finalCode = body.code;
    let qualityStatus: QualityStatus = 'passed';
    let validationIssues: Array<{ type: string; message: string }> = [];
    let autoFixesApplied: string[] = [];

    if (!body.skipValidation) {
      const validation = await validateComponent(body.code, {
        autoFix: true,
        category: body.category,
      });

      qualityStatus = validation.qualityStatus;
      finalCode = validation.fixedCode;
      validationIssues = validation.issues.map((i) => ({ type: i.type, message: i.message }));
      autoFixesApplied = validation.autoFixesApplied;

      // If validation completely failed, reject the component
      if (!validation.valid) {
        return NextResponse.json(
          {
            error: 'Component validation failed',
            issues: validationIssues,
            qualityStatus,
          },
          { status: 400 }
        );
      }
    }

    // Save to database with validated/fixed code
    const { error: dbError } = await supabase.from('components').insert({
      name: body.name,
      description: body.description,
      category: body.category,
      code: finalCode,
      original_code: body.code !== finalCode ? body.code : null,
      file_path: body.filePath,
      dependencies: body.dependencies || [],
      tags: body.tags,
      usage: body.usage,
      source_project: 'mcp-cloudformation-builder',
      quality_status: qualityStatus,
      validation_issues: validationIssues.length > 0 ? validationIssues : null,
      auto_fixes_applied: autoFixesApplied.length > 0 ? autoFixesApplied : null,
      synced_to_scaffold: false,
    });

    if (dbError) {
      console.error('Error saving component:', dbError);
      return NextResponse.json(
        { error: 'Failed to save component' },
        { status: 500 }
      );
    }

    // AUTO-SYNC to scaffold
    let syncResult = null;
    const scaffoldToken = process.env.SCAFFOLD_API_TOKEN;
    if (scaffoldToken) {
      try {
        syncResult = await syncComponentToScaffold({
          name: body.name,
          description: body.description,
          category: body.category,
          code: body.code,
          dependencies: body.dependencies || [],
          tags: body.tags,
        }, scaffoldToken);

        if (syncResult.success) {
          // Mark as synced
          await supabase
            .from('components')
            .update({ synced_to_scaffold: true, synced_at: new Date().toISOString() })
            .eq('name', body.name);
        }

        console.log('[AUTO-SYNC] Component synced to scaffold:', syncResult);
      } catch (syncError) {
        console.error('[AUTO-SYNC] Failed to sync component:', syncError);
      }
    }

    // Log audit event
    await logAuditEvent({
      event_type: 'kb_entry_added',
      success: true,
      metadata: {
        type: 'component',
        name: body.name,
        category: body.category,
        synced: syncResult?.success ?? false,
      },
    });

    return NextResponse.json({
      success: true,
      component: {
        name: body.name,
        category: body.category,
        qualityStatus,
        synced: syncResult?.success ?? false,
      },
      validation: {
        qualityStatus,
        issues: validationIssues,
        autoFixesApplied,
        codeWasModified: body.code !== finalCode,
      },
      message: buildSuccessMessage(qualityStatus, syncResult?.success ?? false, autoFixesApplied),
    });
  } catch (error) {
    console.error('Component API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * GET - List all registered components
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');

    let query = supabase.from('components').select('*');

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching components:', error);
      return NextResponse.json(
        { error: 'Failed to fetch components' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      components: data || [],
      total: data?.length || 0,
    });
  } catch (error) {
    console.error('Component GET error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Build a descriptive success message based on validation results
 */
function buildSuccessMessage(
  qualityStatus: QualityStatus,
  synced: boolean,
  autoFixes: string[]
): string {
  const parts: string[] = [];

  switch (qualityStatus) {
    case 'passed':
      parts.push('Component passed all quality checks.');
      break;
    case 'auto_fixed':
      parts.push(`Component auto-fixed (${autoFixes.length} fix${autoFixes.length > 1 ? 'es' : ''} applied).`);
      break;
    case 'needs_review':
      parts.push('Component saved with warnings. Review recommended.');
      break;
    default:
      parts.push('Component registered.');
  }

  if (synced) {
    parts.push('Synced to scaffold.');
  } else {
    parts.push('Scaffold sync pending.');
  }

  return parts.join(' ');
}
