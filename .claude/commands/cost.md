# Estimate AWS Costs

Estimate the monthly cost for AWS resources.

## Arguments:
$ARGUMENTS - Either a template file path or resource description

## Steps:
1. Parse resources from template or description
2. For each resource, lookup pricing:
   - Use AWS Pricing API for accurate data
   - Fall back to known estimates
3. Calculate monthly cost
4. Show breakdown by resource type

## Output Format:
```
AWS Cost Estimate
─────────────────────────────────────
Resource              | Monthly Cost
─────────────────────────────────────
EC2 t3.micro          | $8.35
RDS db.t3.micro       | $12.41
S3 (10GB)             | $0.23
NAT Gateway           | $32.40
─────────────────────────────────────
TOTAL                 | $53.39/month
─────────────────────────────────────

Notes:
- Data transfer not included
- Prices for us-east-1 region
```

## Include:
- Cost optimization suggestions
- Cheaper alternatives if applicable
- Free tier eligibility
