import { NextRequest, NextResponse } from 'next/server';
import { validateCloudFormationTemplate } from '@/lib/cloudformation/validator';

/**
 * Internal Template Validation API
 *
 * Validates a CloudFormation template against AWS APIs
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
    const { template, region = 'us-east-1' } = body;

    if (!template) {
      return NextResponse.json(
        { success: false, error: 'Missing required field: template' },
        { status: 400 }
      );
    }

    const validationResult = await validateCloudFormationTemplate(template, {
      region,
      validateIAMPolicies: true,
      checkServiceQuotas: true,
    });

    return NextResponse.json({
      success: true,
      validation: validationResult,
    });

  } catch (error: any) {
    console.error('[Internal API] Validation error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
