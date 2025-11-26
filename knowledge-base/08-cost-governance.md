# Cost Governance Rules

## Tagging for Cost Allocation
All resources must have cost tags:
- Environment (dev/staging/prod)
- CostCenter (team or project code)
- Owner (responsible team or individual)
- Project (project name)

## Cost Visibility
- Weekly cost reports per team
- Dashboard showing spend by service
- Trend analysis (week-over-week, month-over-month)
- Anomaly detection and alerts
- Forecast vs actual tracking

## Cost Alerts
- Alert at 80% of monthly budget
- Alert on 20%+ daily spike
- Alert on untagged resources
- Alert on idle resources
- Alert on cost anomalies

## Resource Optimization

### Compute (EC2, ECS, Lambda)
- Right-size instances based on usage
- Use auto-scaling for variable workloads
- Consider Spot instances for non-critical workloads
- Reserved instances for predictable workloads
- Stop dev/staging resources outside business hours

### Storage (S3, EBS)
- Implement lifecycle policies
- Use appropriate storage classes (Standard → IA → Glacier)
- Delete unused snapshots
- Compress data where possible
- Monitor growth trends

### Data Transfer
- Minimize cross-region transfers
- Use VPC endpoints for AWS services
- Cache at the edge (CloudFront)
- Monitor egress costs

### Database (RDS, DynamoDB)
- Right-size database instances
- Use read replicas for read-heavy workloads
- Reserved capacity for production
- Implement connection pooling
- Archive old data

## Approval Requirements
- New resources over $500/month: Team lead approval
- New resources over $2000/month: Finance approval
- GPU instances: Always require approval
- Multi-year commitments: Finance approval

## Cost-Efficient Architecture
- Serverless first for variable workloads
- Use managed services over self-managed
- Implement caching to reduce compute
- Batch processing during off-peak hours
- Multi-tenancy where appropriate

## Waste Elimination Checklist
- [ ] Terminate unused EC2 instances
- [ ] Delete unattached EBS volumes
- [ ] Remove unused Elastic IPs
- [ ] Clean up old snapshots
- [ ] Delete unused load balancers
- [ ] Review and clean S3 buckets
- [ ] Remove unused Lambda functions
- [ ] Check for oversized instances

## Budget Planning
- Set monthly budgets per project
- Review budgets quarterly
- Adjust for planned growth
- Include buffer for unexpected costs
- Track Reserved Instance utilization

## Cost Review Cadence
- Weekly: Team cost review
- Monthly: Project cost review with stakeholders
- Quarterly: Optimization review and RI planning
- Annually: Budget planning and forecasting

## Reserved Instance Strategy
- 1-year reservations for stable workloads
- 3-year for predictable long-term needs
- Convertible RIs for flexibility
- Track RI utilization (target: 90%+)
- Share RIs across accounts via Organizations

## Savings Plans
- Compute Savings Plans for flexibility
- EC2 Instance Savings Plans for known workloads
- Monitor commitment utilization
- Adjust based on usage patterns
