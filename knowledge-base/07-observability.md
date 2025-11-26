# Observability & Reliability Rules

## Three Pillars of Observability

### 1. Metrics
- Track request rate, error rate, duration (RED)
- Track saturation and utilization
- Use Prometheus/CloudWatch format
- Dashboard for every service
- Alert on anomalies

### 2. Logs
- Structured JSON logging
- Consistent log levels (DEBUG, INFO, WARN, ERROR)
- Include correlation IDs
- Centralized log aggregation
- Searchable within 5 minutes of emission

### 3. Traces
- Distributed tracing for all services
- Use OpenTelemetry standard
- Trace sampling for high-volume services
- Link traces to logs
- Visualize service dependencies

## Logging Standards
```typescript
// Good: Structured log with context
logger.info('User created', {
  userId: user.id,
  email: user.email,
  source: 'signup-flow',
  correlationId: req.correlationId
});

// Bad: Unstructured log
console.log('User created: ' + user.email);
```

## Log Levels
- ERROR: System errors, requires immediate attention
- WARN: Potential issues, degraded performance
- INFO: Significant events, state changes
- DEBUG: Detailed information for debugging

## Service Level Objectives (SLOs)
- Define SLOs for every service
- Availability: 99.9% uptime minimum
- Latency: p95 < 200ms for API calls
- Error rate: < 0.1% for critical paths
- Review SLOs quarterly

## Alerting Rules
- Alert on symptoms, not causes
- Use multi-window, multi-burn-rate alerts
- Page only for customer-impacting issues
- Tiered severity (P1-P4)
- Runbook for every alert

## Alert Severity
- **P1**: Complete outage, immediate response
- **P2**: Significant degradation, response within 30 min
- **P3**: Minor issue, response within 4 hours
- **P4**: Low priority, next business day

## On-Call Requirements
- On-call rotation documented
- Escalation path defined
- Handoff procedures clear
- Compensation policy in place
- Maximum shift: 7 days

## Incident Response
1. Acknowledge within 5 minutes
2. Assess impact and severity
3. Communicate status (internal + external if needed)
4. Mitigate before root cause
5. Restore service
6. Post-incident review within 48 hours

## Dashboards
Every service must have a dashboard showing:
- Request rate
- Error rate
- Latency percentiles
- Resource utilization
- Key business metrics

## Health Checks
- Implement /health endpoint
- Check database connectivity
- Check external dependencies
- Return detailed status for debugging
- Simple pass/fail for load balancers

## Chaos Engineering
- Test failure modes in staging
- Gradually introduce chaos in production
- Document failure recovery procedures
- Run game days quarterly
