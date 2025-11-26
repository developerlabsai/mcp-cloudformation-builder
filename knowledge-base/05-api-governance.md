# API Governance Rules

## API Design Principles
- REST for resource-based APIs
- GraphQL for complex querying needs
- Consistent naming and structure
- Versioning from day one
- Design for the client, not the server

## OpenAPI/Swagger Requirements
- All APIs must have OpenAPI spec
- Spec must be in sync with implementation
- Include examples for all endpoints
- Document all error responses
- Generate types from spec

## Versioning Strategy
- Use URL versioning (/api/v1/users)
- Semantic versioning for breaking changes
- Support N-1 version minimum
- Deprecation notice 6 months before removal
- Migration guide for breaking changes

## Request/Response Standards
```typescript
// Success Response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "total": 100
  }
}

// Error Response
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": [...]
  }
}
```

## HTTP Status Codes
- 200: Success
- 201: Created
- 204: No Content (DELETE)
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 409: Conflict
- 422: Unprocessable Entity
- 429: Too Many Requests
- 500: Internal Server Error

## Authentication Requirements
- Use JWT or API keys for authentication
- Short-lived access tokens (15 min - 1 hour)
- Refresh tokens for web apps
- API keys for service-to-service
- OAuth 2.0 for third-party access

## Rate Limiting
- Implement rate limiting on all public endpoints
- Standard limit: 100 requests/minute
- Return 429 with Retry-After header
- Different limits for authenticated vs anonymous
- Document limits in API spec

## Input Validation
- Validate all inputs server-side
- Use Zod or similar for schema validation
- Sanitize inputs to prevent injection
- Limit request body size
- Validate content types

## Pagination
- Use cursor-based pagination for large datasets
- Default page size: 20
- Maximum page size: 100
- Include total count when feasible
- Return next/previous cursors

## Caching
- Use ETags for cache validation
- Set appropriate Cache-Control headers
- Document caching behavior
- Invalidate cache on mutations

## Error Handling
- Never expose internal errors to clients
- Log full error details server-side
- Return user-friendly error messages
- Include error codes for programmatic handling
- Provide actionable error messages

## Monitoring & Metrics
- Log all API requests
- Track latency percentiles (p50, p95, p99)
- Monitor error rates by endpoint
- Alert on anomalies
- Dashboard for API health

## Deprecation Process
1. Announce deprecation in changelog
2. Add deprecation header to responses
3. Notify API consumers directly
4. Provide migration path
5. Maintain deprecated version for 6 months
6. Remove with final notice
