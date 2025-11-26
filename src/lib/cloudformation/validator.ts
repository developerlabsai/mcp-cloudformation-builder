/**
 * AWS CloudFormation Validator
 *
 * Phase 3: AWS MCP/SDK Validation Layer
 *
 * This module integrates with AWS services to validate CloudFormation templates:
 * 1. CloudFormation ValidateTemplate API - Syntax and structural validation
 * 2. IAM Access Analyzer - Policy validation and security checks
 * 3. Service Quotas - Resource limit validation
 *
 * Target: 95.8% accuracy (up from 92% with SpecKit alone)
 */

import { CloudFormationClient, ValidateTemplateCommand } from '@aws-sdk/client-cloudformation';
import { ServiceQuotasClient, GetServiceQuotaCommand } from '@aws-sdk/client-service-quotas';
import {
  AccessAnalyzerClient,
  ValidatePolicyCommand,
  ValidatePolicyResourceType,
  PolicyType,
} from '@aws-sdk/client-accessanalyzer';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  confidenceScore: number; // 0-100
  validationTime: number;
  checksPerformed: {
    syntaxValidation: boolean;
    iamPolicyValidation: boolean;
    serviceQuotaValidation: boolean;
  };
}

export interface ValidationError {
  code: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  source: 'cloudformation' | 'iam' | 'quotas';
  suggestion?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
  suggestion?: string;
}

export interface ValidationOptions {
  region?: string;
  validateIAMPolicies?: boolean;
  checkServiceQuotas?: boolean;
  expectedResources?: {
    ec2Instances?: number;
    rdsInstances?: number;
    lambdaFunctions?: number;
  };
}

/**
 * Main validation function - validates a CloudFormation template using AWS services
 */
export async function validateCloudFormationTemplate(
  template: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> {
  const startTime = Date.now();

  console.log('🔍 Starting AWS validation (Phase 3)...');

  const result: ValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    confidenceScore: 100,
    validationTime: 0,
    checksPerformed: {
      syntaxValidation: false,
      iamPolicyValidation: false,
      serviceQuotaValidation: false,
    },
  };

  const region = options.region || process.env.AWS_REGION || 'us-east-1';

  try {
    // Step 1: CloudFormation Syntax Validation
    console.log('  📋 Validating CloudFormation syntax...');
    const syntaxResult = await validateTemplateSyntax(template, region);
    result.checksPerformed.syntaxValidation = true;

    if (!syntaxResult.valid) {
      result.isValid = false;
      result.errors.push(...syntaxResult.errors);
      result.confidenceScore -= 30; // Major penalty for syntax errors
    } else {
      result.warnings.push(...syntaxResult.warnings);
      console.log('    ✓ Syntax validation passed');
    }

    // Step 2: IAM Policy Validation (if enabled and policies found)
    if (options.validateIAMPolicies !== false) {
      console.log('  🔐 Validating IAM policies...');
      const iamResult = await validateIAMPolicies(template, region);
      result.checksPerformed.iamPolicyValidation = true;

      if (iamResult.errors.length > 0) {
        result.errors.push(...iamResult.errors);
        result.confidenceScore -= iamResult.errors.length * 5; // 5 points per IAM error
      }

      if (iamResult.warnings.length > 0) {
        result.warnings.push(...iamResult.warnings);
        result.confidenceScore -= iamResult.warnings.length * 2; // 2 points per warning
      }

      console.log(`    ✓ IAM validation complete (${iamResult.policiesChecked} policies)`);
    }

    // Step 3: Service Quotas Validation (if enabled and limits specified)
    if (options.checkServiceQuotas !== false && options.expectedResources) {
      console.log('  📊 Checking service quotas...');
      const quotaResult = await validateServiceQuotas(options.expectedResources, region);
      result.checksPerformed.serviceQuotaValidation = true;

      if (quotaResult.errors.length > 0) {
        result.errors.push(...quotaResult.errors);
        result.confidenceScore -= quotaResult.errors.length * 10; // 10 points per quota violation
      }

      if (quotaResult.warnings.length > 0) {
        result.warnings.push(...quotaResult.warnings);
        result.confidenceScore -= quotaResult.warnings.length * 3; // 3 points per quota warning
      }

      console.log(`    ✓ Service quota validation complete`);
    }

    // Ensure confidence score stays within 0-100 range
    result.confidenceScore = Math.max(0, Math.min(100, result.confidenceScore));

  } catch (error) {
    console.error('  ❌ Validation error:', error);
    result.isValid = false;
    result.errors.push({
      code: 'VALIDATION_FAILED',
      message: error instanceof Error ? error.message : 'Unknown validation error',
      severity: 'critical',
      source: 'cloudformation',
    });
    result.confidenceScore = 0;
  }

  result.validationTime = Date.now() - startTime;

  console.log(`🔍 Validation complete in ${result.validationTime}ms`);
  console.log(`  Confidence Score: ${result.confidenceScore}%`);
  console.log(`  Errors: ${result.errors.length}, Warnings: ${result.warnings.length}`);

  return result;
}

/**
 * Step 1: Validate template syntax using CloudFormation ValidateTemplate API
 */
async function validateTemplateSyntax(
  template: string,
  region: string
): Promise<{
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  parameters?: string[];
}> {
  try {
    const client = new CloudFormationClient({ region });

    const command = new ValidateTemplateCommand({
      TemplateBody: template,
    });

    const response = await client.send(command);

    return {
      valid: true,
      errors: [],
      warnings: [],
      parameters: response.Parameters?.map(p => p.ParameterKey || '') || [],
    };

  } catch (error: any) {
    // Parse CloudFormation validation errors
    const errorMessage = error.message || 'Unknown validation error';

    return {
      valid: false,
      errors: [
        {
          code: error.Code || 'SYNTAX_ERROR',
          message: errorMessage,
          severity: 'critical',
          source: 'cloudformation',
          suggestion: getSyntaxSuggestion(errorMessage),
        },
      ],
      warnings: [],
    };
  }
}

/**
 * Step 2: Validate IAM policies using Access Analyzer
 */
async function validateIAMPolicies(
  template: string,
  region: string
): Promise<{
  errors: ValidationError[];
  warnings: ValidationWarning[];
  policiesChecked: number;
}> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];
  let policiesChecked = 0;

  try {
    // Extract IAM policies from template
    const policies = extractIAMPolicies(template);

    if (policies.length === 0) {
      return { errors, warnings, policiesChecked };
    }

    const client = new AccessAnalyzerClient({ region });

    // Validate each policy
    for (const policy of policies) {
      try {
        const command = new ValidatePolicyCommand({
          policyDocument: JSON.stringify(policy.document),
          policyType: PolicyType.IDENTITY_POLICY,
          // validatePolicyResourceType removed - AWS_IAM_ROLE not valid for this SDK version
        });

        const response = await client.send(command);
        policiesChecked++;

        // Process findings
        if (response.findings && response.findings.length > 0) {
          for (const finding of response.findings) {
            if (finding.findingType === 'ERROR') {
              errors.push({
                code: finding.issueCode || 'IAM_POLICY_ERROR',
                message: `IAM Policy "${policy.name}": ${finding.findingDetails}`,
                severity: 'high',
                source: 'iam',
                suggestion: finding.learnMoreLink,
              });
            } else if (finding.findingType === 'WARNING') {
              warnings.push({
                code: finding.issueCode || 'IAM_POLICY_WARNING',
                message: `IAM Policy "${policy.name}": ${finding.findingDetails}`,
                suggestion: finding.learnMoreLink,
              });
            }
          }
        }

      } catch (policyError: any) {
        errors.push({
          code: 'IAM_VALIDATION_ERROR',
          message: `Failed to validate policy "${policy.name}": ${policyError.message}`,
          severity: 'medium',
          source: 'iam',
        });
      }
    }

  } catch (error: any) {
    errors.push({
      code: 'IAM_ANALYZER_ERROR',
      message: `IAM Access Analyzer error: ${error.message}`,
      severity: 'low',
      source: 'iam',
    });
  }

  return { errors, warnings, policiesChecked };
}

/**
 * Step 3: Validate service quotas
 */
async function validateServiceQuotas(
  expectedResources: NonNullable<ValidationOptions['expectedResources']>,
  region: string
): Promise<{
  errors: ValidationError[];
  warnings: ValidationWarning[];
}> {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    const client = new ServiceQuotasClient({ region });

    // Check EC2 instance quota
    if (expectedResources.ec2Instances) {
      try {
        const quota = await client.send(
          new GetServiceQuotaCommand({
            ServiceCode: 'ec2',
            QuotaCode: 'L-1216C47A', // Running On-Demand Standard instances
          })
        );

        const limit = quota.Quota?.Value || 20; // Default limit

        if (expectedResources.ec2Instances > limit) {
          errors.push({
            code: 'QUOTA_EXCEEDED',
            message: `EC2 instances (${expectedResources.ec2Instances}) exceeds quota (${limit})`,
            severity: 'high',
            source: 'quotas',
            suggestion: 'Request a quota increase or reduce instance count',
          });
        } else if (expectedResources.ec2Instances > limit * 0.8) {
          warnings.push({
            code: 'QUOTA_WARNING',
            message: `EC2 instances (${expectedResources.ec2Instances}) approaching quota (${limit})`,
            suggestion: 'Consider requesting a quota increase',
          });
        }
      } catch (quotaError) {
        // Quota API might fail, treat as warning
        warnings.push({
          code: 'QUOTA_CHECK_FAILED',
          message: 'Unable to verify EC2 instance quota',
        });
      }
    }

    // Check RDS instance quota
    if (expectedResources.rdsInstances) {
      try {
        const quota = await client.send(
          new GetServiceQuotaCommand({
            ServiceCode: 'rds',
            QuotaCode: 'L-7B6409FD', // DB instances
          })
        );

        const limit = quota.Quota?.Value || 40; // Default limit

        if (expectedResources.rdsInstances > limit) {
          errors.push({
            code: 'QUOTA_EXCEEDED',
            message: `RDS instances (${expectedResources.rdsInstances}) exceeds quota (${limit})`,
            severity: 'high',
            source: 'quotas',
            suggestion: 'Request a quota increase or reduce RDS instance count',
          });
        }
      } catch (quotaError) {
        warnings.push({
          code: 'QUOTA_CHECK_FAILED',
          message: 'Unable to verify RDS instance quota',
        });
      }
    }

    // Check Lambda function quota
    if (expectedResources.lambdaFunctions) {
      try {
        const quota = await client.send(
          new GetServiceQuotaCommand({
            ServiceCode: 'lambda',
            QuotaCode: 'L-9FEE3D26', // Concurrent executions
          })
        );

        const limit = quota.Quota?.Value || 1000; // Default limit

        if (expectedResources.lambdaFunctions > limit) {
          errors.push({
            code: 'QUOTA_EXCEEDED',
            message: `Lambda functions (${expectedResources.lambdaFunctions}) exceeds quota (${limit})`,
            severity: 'high',
            source: 'quotas',
            suggestion: 'Request a quota increase or reduce Lambda function count',
          });
        }
      } catch (quotaError) {
        warnings.push({
          code: 'QUOTA_CHECK_FAILED',
          message: 'Unable to verify Lambda function quota',
        });
      }
    }

  } catch (error: any) {
    warnings.push({
      code: 'SERVICE_QUOTAS_ERROR',
      message: `Service Quotas API error: ${error.message}`,
    });
  }

  return { errors, warnings };
}

/**
 * Helper: Extract IAM policies from CloudFormation template
 */
function extractIAMPolicies(template: string): Array<{
  name: string;
  document: any;
}> {
  const policies: Array<{ name: string; document: any }> = [];

  try {
    // Parse YAML template (CloudFormation templates are YAML)
    const lines = template.split('\n');
    let currentResource: string | null = null;
    let inPolicyDocument = false;
    let policyDocument = '';
    let braceCount = 0;

    for (const line of lines) {
      // Detect IAM role or policy resource
      if (line.includes('AWS::IAM::Role') || line.includes('AWS::IAM::Policy')) {
        currentResource = line.trim();
      }

      // Detect PolicyDocument section
      if (line.includes('PolicyDocument:')) {
        inPolicyDocument = true;
        policyDocument = '';
        braceCount = 0;
      }

      // Collect policy document lines
      if (inPolicyDocument) {
        policyDocument += line + '\n';

        // Count braces to detect end of policy
        braceCount += (line.match(/{/g) || []).length;
        braceCount -= (line.match(/}/g) || []).length;

        if (braceCount === 0 && policyDocument.trim().length > 0) {
          // Try to parse the policy document
          try {
            // Simple extraction - in production, use proper YAML parser
            const jsonMatch = policyDocument.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const doc = JSON.parse(jsonMatch[0]);
              policies.push({
                name: currentResource || 'UnknownPolicy',
                document: doc,
              });
            }
          } catch (parseError) {
            // Skip malformed policies
          }

          inPolicyDocument = false;
          currentResource = null;
        }
      }
    }

  } catch (error) {
    console.error('  ⚠ Failed to extract IAM policies:', error);
  }

  return policies;
}

/**
 * Helper: Get syntax suggestion based on error message
 */
function getSyntaxSuggestion(errorMessage: string): string {
  if (errorMessage.includes('Template format error')) {
    return 'Ensure the template is valid YAML or JSON format';
  }
  if (errorMessage.includes('Unresolved resource dependencies')) {
    return 'Check that all resource references use correct logical IDs';
  }
  if (errorMessage.includes('Invalid template property')) {
    return 'Verify all property names match CloudFormation resource specifications';
  }
  if (errorMessage.includes('Template validation error')) {
    return 'Review AWS CloudFormation template reference for correct syntax';
  }
  return 'Check AWS CloudFormation documentation for template requirements';
}

/**
 * Helper: Count expected resources in template for quota validation
 */
export function countTemplateResources(template: string): {
  ec2Instances: number;
  rdsInstances: number;
  lambdaFunctions: number;
} {
  const counts = {
    ec2Instances: 0,
    rdsInstances: 0,
    lambdaFunctions: 0,
  };

  try {
    // Count EC2 instances
    const ec2Matches = template.match(/Type:\s*AWS::EC2::Instance/g);
    counts.ec2Instances = ec2Matches?.length || 0;

    // Count RDS instances
    const rdsMatches = template.match(/Type:\s*AWS::RDS::DBInstance/g);
    counts.rdsInstances = rdsMatches?.length || 0;

    // Count Lambda functions
    const lambdaMatches = template.match(/Type:\s*AWS::Lambda::Function/g);
    counts.lambdaFunctions = lambdaMatches?.length || 0;

  } catch (error) {
    console.error('  ⚠ Failed to count resources:', error);
  }

  return counts;
}
