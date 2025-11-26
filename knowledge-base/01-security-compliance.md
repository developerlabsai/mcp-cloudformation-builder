# Security & Compliance Rules

## Principle: Least Privilege
Always apply the principle of least privilege. IAM roles, API access, and service permissions must be restricted to the absolute minimum required for the task.

## Secret Management
- Never hardcode secrets, API keys, or credentials in source code
- Use environment variables for all sensitive configuration
- Rotate secrets regularly (at least every 90 days for production)
- Use encrypted storage (AWS KMS, Secrets Manager, HashiCorp Vault)
- Never commit .env files or secret files to version control

## Network Security
- All traffic must be encrypted (HTTPS, TLS 1.2+)
- Use VPCs with proper subnet segmentation (public/private)
- Implement security groups with minimal required ports
- Use private endpoints for AWS services when possible
- Enable VPC Flow Logs for network monitoring

## Dependency Security
- Run dependency scanning (Snyk, Dependabot, npm audit) before merging
- No critical or high severity vulnerabilities in production
- Pin dependency versions in package.json
- Review dependency licenses for compliance
- Update dependencies regularly (at least monthly security patches)

## Static Analysis
- All code must pass static analysis before merging
- Use ESLint with security plugins
- Enable TypeScript strict mode
- No eval(), Function constructor, or dynamic code execution
- Sanitize all user inputs

## Audit Logging
- Enable CloudTrail for all AWS API calls
- Log all authentication events
- Log all data access events for sensitive data
- Retain logs for compliance period (minimum 90 days, often 1 year)
- Never log sensitive data (PII, secrets, passwords)

## Compliance Frameworks
When applicable, ensure compliance with:
- SOC 2 Type II
- ISO 27001
- GDPR (for EU user data)
- HIPAA (for health data)
- PCI DSS (for payment data)

## Secure Coding Patterns
- Use parameterized queries to prevent SQL injection
- Escape output to prevent XSS
- Validate all inputs on the server side
- Implement CSRF protection for state-changing operations
- Use secure session management

## Peer Review Requirements
- All security-sensitive changes require 2 approvals
- Security team review required for authentication changes
- Penetration testing required before major releases
- Vulnerability disclosure process must be documented

## Incident Response
- Security incidents must be reported within 1 hour
- Incident response runbook must be maintained
- Post-incident reviews required within 48 hours
- Customer notification within 72 hours for data breaches
