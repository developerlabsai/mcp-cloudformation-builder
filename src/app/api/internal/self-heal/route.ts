import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/database/supabase';

/**
 * Internal Self-Healing API
 *
 * Attempts to automatically fix CloudFormation template errors
 * Requires INTERNAL_API_SECRET authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify internal API secret
    const apiSecret = request.headers.get('x-internal-api-secret');
    if (!apiSecret || apiSecret !== process.env.INTERNAL_API_SECRET) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized - Invalid API secret' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { template, errors, repository_url } = body;

    if (!template || !errors) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: template, errors' },
        { status: 400 }
      );
    }

    console.log('[Self-Heal API] Attempting to heal template...');

    // Import healing engine dynamically
    const { healWithRetries } = await import('@/lib/cloudformation/healer');

    // Attempt healing
    const healingResult = await healWithRetries(
      template,
      errors,
      null, // specKitResult not available in this context
      repository_url
    );

    // Store healing result in database
    if (healingResult.success) {
      await supabase.from('template_deployment_logs').insert({
        repository_url,
        template_before: template,
        template_after: healingResult.healedTemplate,
        healing_applied: true,
        healing_successful: healingResult.success,
        errors_fixed: errors,
      });
    }

    return NextResponse.json({
      success: healingResult.success,
      healed_template: healingResult.healedTemplate || null,
      changes_applied: healingResult.appliedFixes || [],
      validation_result: healingResult.validationResult || null,
    });

  } catch (error: any) {
    console.error('[Self-Heal API] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
