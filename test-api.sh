#!/bin/bash

# Test script for MCP CloudFormation Builder Internal API

echo "🧪 Testing MCP CloudFormation Builder Internal API"
echo "=================================================="
echo ""

# Test 1: Homepage
echo "Test 1: Homepage (GET /)"
curl -s http://localhost:3001 | grep -o "MCP CloudFormation Builder" && echo "✅ Homepage working" || echo "❌ Homepage failed"
echo ""

# Test 2: Internal API - Missing auth
echo "Test 2: Internal API - No auth (should return 401)"
curl -s -X POST http://localhost:3001/api/internal/generate-cloudformation \
  -H "Content-Type: application/json" \
  -d '{"repository_url": "https://github.com/test/repo"}' | grep -o "Unauthorized" && echo "✅ Auth check working" || echo "❌ Auth check failed"
echo ""

# Test 3: Internal API - With auth (placeholder response expected)
echo "Test 3: Internal API - With auth"
curl -s -X POST http://localhost:3001/api/internal/generate-cloudformation \
  -H "Content-Type: application/json" \
  -H "x-internal-api-secret: mcp-builder-internal-secret-2025-d8f7a3c9b1e4f2a6" \
  -d '{
    "repository_url": "https://github.com/vercel/next.js",
    "environment": "dev",
    "region": "us-east-1",
    "partner_id": "00000000-0000-0000-0000-000000000000",
    "user_id": "00000000-0000-0000-0000-000000000000",
    "options": {
      "enable_healing": false,
      "use_pattern_db": false,
      "cost_analysis": false
    }
  }' && echo "✅ Internal API responding" || echo "❌ Internal API failed"
echo ""

# Test 4: Pattern DB Check
echo "Test 4: Pattern DB Check"
curl -s -X POST http://localhost:3001/api/internal/check-pattern-db \
  -H "Content-Type: application/json" \
  -H "x-internal-api-secret: mcp-builder-internal-secret-2025-d8f7a3c9b1e4f2a6" \
  -d '{"error_message": "InvalidParameterValue"}' && echo "✅ Pattern DB endpoint responding" || echo "❌ Pattern DB failed"
echo ""

echo "=================================================="
echo "✅ API tests complete!"
echo ""
echo "Note: Full CloudFormation generation requires:"
echo "  1. Supabase database with migrations applied"
echo "  2. Full conversion logic wired up"
echo "  3. AWS credentials for validation"
