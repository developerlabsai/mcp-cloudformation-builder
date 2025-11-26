# Generate CloudFormation Template

Generate a CloudFormation template based on user requirements.

## Arguments:
$ARGUMENTS - Description of the AWS infrastructure needed

## Steps:
1. Parse the infrastructure requirements from $ARGUMENTS
2. Identify required AWS resources
3. Generate valid CloudFormation YAML template
4. Include:
   - Description and metadata
   - Parameters for configurable values
   - Resources with proper dependencies
   - Outputs for important values
   - Tags for all resources
5. Estimate monthly cost
6. Validate with `aws cloudformation validate-template`

## Output Format:
- Show the generated template
- List resources created
- Show cost estimate
- Suggest optimizations if applicable
