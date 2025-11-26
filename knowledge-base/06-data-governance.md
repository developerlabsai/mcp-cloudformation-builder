# Data Governance Rules

## Data Classification
- **Public**: Can be shared freely (marketing content)
- **Internal**: For internal use only (internal docs)
- **Confidential**: Limited access (business data)
- **Restricted**: Highly sensitive (PII, credentials, health data)

## PII Handling
- Identify all PII fields in your data
- Encrypt PII at rest and in transit
- Minimize PII collection (only what's necessary)
- Document PII data flows
- Implement data subject rights (access, deletion, portability)

## Encryption Requirements
- AES-256 for data at rest
- TLS 1.2+ for data in transit
- Use managed key services (AWS KMS)
- Rotate encryption keys annually
- Never store unencrypted sensitive data

## Data Retention
- Define retention period for each data type
- Implement automated deletion after retention period
- User data: Delete within 30 days of account deletion
- Logs: Retain for 90 days minimum
- Financial records: As required by law (often 7 years)
- Backup retention: 30 days

## Data Access Control
- Role-based access control (RBAC)
- Audit all data access
- Review access permissions quarterly
- Remove access on role change/departure
- Use database row-level security (RLS)

## Database Standards
- Use UUIDs for primary keys
- Timestamp all records (created_at, updated_at)
- Soft delete for user-facing data
- Foreign key constraints where appropriate
- Index frequently queried columns

## Schema Evolution
- Backward-compatible changes preferred
- Use migrations for all schema changes
- Test migrations in staging first
- Document breaking changes
- Zero-downtime migration strategies

## Data Quality
- Validate data on input
- Implement data quality checks
- Monitor for data anomalies
- Clean up stale/orphaned data
- Regular data integrity checks

## Anonymization/Pseudonymization
- Anonymize data for analytics when possible
- Use pseudonymization for development/staging
- Remove PII from logs
- Hash identifiers in non-production environments

## Backup and Recovery
- Daily automated backups
- Test restore procedures monthly
- Point-in-time recovery capability
- Backup encryption required
- Offsite backup storage
- Document recovery time objectives (RTO/RPO)

## Data Ownership
- Every dataset must have an owner
- Owner responsible for access decisions
- Owner maintains data dictionary
- Owner approves data sharing requests

## Cross-Border Data Transfer
- Know where your data is stored
- Comply with GDPR for EU data
- Use appropriate transfer mechanisms
- Document data residency requirements
