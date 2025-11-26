# Validate CloudFormation Template

Validate a CloudFormation template for correctness.

## Arguments:
$ARGUMENTS - Path to template file or "clipboard" to use last generated

## Steps:
1. Read the template file
2. Run AWS CLI validation: `aws cloudformation validate-template --template-body file://path`
3. Check for common issues:
   - Missing required properties
   - Invalid resource references
   - Circular dependencies
   - Deprecated resource types
4. Report validation results

## Output:
- Validation status (PASS/FAIL)
- List of errors if any
- Warnings and suggestions
- Estimated capabilities required
