# Infrastructure as Code (IaC) Governance

## Declarative IaC Only
- All infrastructure must be defined in code (Terraform, CloudFormation, CDK, Pulumi)
- No manual changes via AWS Console, CLI, or API for production resources
- Emergency manual changes must be documented and backfilled into IaC within 24 hours

## Version Control
- All IaC code must be in Git
- Use meaningful commit messages for infrastructure changes
- Tag releases for production deployments
- Maintain changelog for infrastructure changes

## Drift Detection
- Run automated drift detection daily
- Alert on any drift from declared state
- Remediate drift within 24 hours for production
- Document any intentional drift with justification

## Mandatory Tagging
All resources must have these tags:
- Environment (dev, staging, prod)
- Owner (team or individual)
- CostCenter (for billing allocation)
- Project (project name)
- ManagedBy (terraform, cloudformation, etc.)

## Naming Conventions
- Use consistent naming: {project}-{environment}-{resource-type}-{identifier}
- Example: mcp-builder-prod-vpc-main
- No special characters except hyphens
- All lowercase

## Module Standards
- Use approved module registry for common patterns
- Document all module inputs and outputs
- Include examples in module documentation
- Version modules semantically (major.minor.patch)

## Environment Promotion
- Dev → Staging → Production pipeline required
- No direct deployments to production
- Staging must mirror production configuration
- Automated testing required between stages

## CloudFormation Specific Rules
- Use Parameters for all environment-specific values
- Define Outputs for values needed by other stacks
- Use DeletionPolicy: Retain for stateful resources
- Include Description for all resources
- Use Conditions for optional resources
- Validate templates with cfn-lint before deployment

## Terraform Specific Rules
- Use remote state with locking (S3 + DynamoDB)
- Use workspaces or separate state files per environment
- Run terraform plan before apply
- Use terraform validate and tflint
- Lock provider versions

## Rollback Procedures
- Document rollback steps for every deployment
- Test rollback procedures in staging
- Maintain previous working state/version
- Automated rollback on health check failure
