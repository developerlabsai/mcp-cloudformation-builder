# Test API Endpoints

Test the API endpoints to verify they are working correctly.

## Steps:
1. Ensure dev server is running (`npm run dev`)
2. Test each endpoint:
   - POST /api/cloudformation
   - POST /api/orchestrate
   - GET /api/internal/check-pattern-db
   - POST /api/internal/validate-template
3. Report results with status codes and response summaries

## Example Tests:
```bash
# Generate template
curl -X POST http://localhost:3001/api/cloudformation \
  -H "Content-Type: application/json" \
  -d '{"description": "Simple S3 bucket"}'

# Validate template
curl -X POST http://localhost:3001/api/internal/validate-template \
  -H "Content-Type: application/json" \
  -d '{"template": "..."}'
```
