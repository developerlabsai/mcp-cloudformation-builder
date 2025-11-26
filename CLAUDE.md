# CLAUDE.md - Project Constitution & Rules

This file defines the rules, patterns, and guidelines that Claude Code must follow when working on this project.

## Project Overview

**MCP CloudFormation Builder** - An MCP server that generates, validates, and manages AWS CloudFormation templates with AI-powered assistance.

### Tech Stack
- **Framework**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **AI Providers**: Anthropic Claude (primary), OpenAI, Google Gemini
- **Cloud**: AWS (CloudFormation, Pricing API, IAM)
- **Email**: Resend
- **Deployment**: Vercel

---

## Core Principles

### 1. Token Efficiency
- **Always read before writing** - Never guess file contents
- **Use targeted searches** - Grep/Glob before exploring entire directories
- **Batch operations** - Combine related changes in single edits
- **Avoid redundant reads** - Don't re-read files already in context
- **Be concise** - Short responses unless detail is requested

### 2. Ask Before Assuming
- **Clarify ambiguous requirements** before implementing
- **Confirm breaking changes** before making them
- **Ask about preferences** (naming, patterns, approach) when multiple valid options exist
- **Verify understanding** of complex features before coding

### 3. Incremental Development
- **Small, testable changes** - One feature at a time
- **Commit early and often** - Logical, atomic commits
- **Test after each change** - Verify before moving on
- **Keep things working** - Don't break existing functionality

---

## Code Standards

### TypeScript/JavaScript
```typescript
// Use explicit types, avoid 'any'
// Prefer interfaces over types for objects
// Use async/await over .then()
// Destructure parameters when >2 args
// Keep functions under 50 lines
```

### File Organization
```
src/
├── app/           # Next.js App Router pages and API routes
│   └── api/       # API endpoints
├── lib/           # Shared utilities and services
│   ├── aws/       # AWS SDK utilities
│   ├── cloudformation/  # CF generation/validation
│   ├── database/  # Supabase client
│   └── self-healing/    # Auto-fix patterns
└── components/    # React components (if any)
```

### Naming Conventions
- **Files**: kebab-case (`pricing-utils.ts`)
- **Components**: PascalCase (`TemplateCard.tsx`)
- **Functions**: camelCase (`generateTemplate`)
- **Constants**: SCREAMING_SNAKE (`MAX_RETRY_COUNT`)
- **Database tables**: snake_case (`cloudformation_templates`)

### Error Handling
```typescript
// Always use try-catch for async operations
// Return structured errors: { error: string, code?: string }
// Log errors with context
// Never expose internal errors to users
```

---

## Database Rules (Supabase)

### Migrations
- **Sequential numbering**: `001_`, `002_`, etc.
- **Descriptive names**: `003_pricing_cache.sql`
- **Always include rollback consideration**
- **Test locally before pushing**: `supabase db push`

### RLS Policies
- **Enable RLS on all tables**
- **Service role for API operations**
- **User-scoped policies for user data**

---

## API Design

### Endpoint Patterns
```
POST /api/cloudformation      # Generate template
POST /api/orchestrate         # Multi-step workflow
GET  /api/internal/*          # Internal service calls
```

### Response Format
```typescript
// Success
{ success: true, data: {...} }

// Error
{ success: false, error: "message", code?: "ERROR_CODE" }
```

### Security
- **Validate all inputs** with Zod or similar
- **Rate limit public endpoints**
- **Use INTERNAL_API_SECRET for internal calls**
- **Never expose API keys in responses**

---

## AWS CloudFormation Standards

### Template Quality
- **Include descriptions** for all resources
- **Use Parameters** for configurable values
- **Define Outputs** for important values
- **Add Tags** to all taggable resources
- **Validate with AWS CLI** before saving

### Cost Awareness
- **Always estimate costs** when generating templates
- **Warn about expensive resources** (NAT Gateway, RDS, etc.)
- **Suggest cost-effective alternatives**

---

## Git Workflow

### Commit Messages
```
feat: Add CloudFormation validation endpoint
fix: Correct pricing calculation for t3.micro
refactor: Extract template generator to separate module
docs: Update API documentation
```

### Branch Strategy
- **main**: Production-ready code
- **feature/***: New features
- **fix/***: Bug fixes

---

## Environment Variables

Required variables (see `.env.local`):
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`
- `ANTHROPIC_API_KEY`
- `OPENAI_API_KEY`
- `GEMINI_API_KEY`
- `RESEND_API_KEY`
- `INTERNAL_API_SECRET`

---

## Testing Requirements

- **Test API endpoints** with curl or test scripts
- **Validate CloudFormation output** with AWS CLI
- **Check database migrations** in staging first
- **Verify environment variables** are set

---

## Performance Guidelines

- **Cache expensive operations** (pricing data, template patterns)
- **Use connection pooling** for database
- **Lazy load AI providers** - only initialize when needed
- **Stream large responses** when possible

---

## What NOT to Do

- Don't commit `.env.local` or secrets
- Don't use `any` type in TypeScript
- Don't make breaking API changes without versioning
- Don't skip error handling
- Don't hardcode AWS regions or account IDs
- Don't store sensitive data unencrypted
- Don't create files without asking if unsure about location

---

## Quick Reference Commands

Use these slash commands for common tasks:
- `/deploy` - Deploy to Vercel
- `/db-push` - Push database migrations
- `/test-api` - Test API endpoints
- `/gen-template` - Generate a CloudFormation template
- `/validate` - Validate current template
- `/status` - Show project status
