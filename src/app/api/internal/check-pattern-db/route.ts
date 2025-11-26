import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/database/supabase';

/**
 * Internal Pattern Database Query API
 *
 * Checks if an error pattern exists in the self-healing database
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
    const { error_message, error_type } = body;

    if (!error_message) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: error_message' },
        { status: 400 }
      );
    }

    // Query pattern database
    const { data: patterns, error } = await supabase
      .from('template_auto_fixes')
      .select('*')
      .ilike('error_pattern', `%${error_message}%`)
      .order('success_count', { ascending: false })
      .limit(5);

    if (error) {
      throw error;
    }

    // Check if we have a high-confidence match
    const highConfidenceMatch = patterns?.find(
      (p) => p.success_count > 5 && p.success_rate > 0.9
    );

    return NextResponse.json({
      success: true,
      pattern_found: !!highConfidenceMatch,
      patterns: patterns || [],
      recommended_fix: highConfidenceMatch?.fix_template || null,
    });

  } catch (error: any) {
    console.error('[Internal API] Pattern DB error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
