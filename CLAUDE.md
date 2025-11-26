# CLAUDE.md - Project Constitution & Rules

This file defines the rules, patterns, and guidelines that Claude Code must follow when working on this project.

## Project Overview

**MCP CloudFormation Builder** - An MCP server that generates, validates, and manages AWS CloudFormation templates with AI-powered assistance.

### Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS + shadcn/ui (ALWAYS use these for UI)
- **Database**: Supabase (PostgreSQL)
- **AI Providers**: Anthropic Claude (primary), OpenAI, Google Gemini
- **Cloud**: AWS (CloudFormation, Pricing API, IAM)
- **Email**: Resend
- **Deployment**: Vercel
- **RAG**: Pinecone (vector database for knowledge retrieval)
- **Specs**: GitHub SpecKit (REQUIRED for all new features)

---

## Development Workflow: SpecKit First

**ALWAYS use GitHub SpecKit before implementing any new feature.**

### Feature Development Process

```text
1. DISCUSS    →  2. SPEC      →  3. BUILD     →  4. SHIP
   (Clarify)      (SpecKit)      (Implement)     (Deploy)
```

### SpecKit Requirements

For every new feature:

1. **Create a spec** using SpecKit before writing any code
2. **Spec must include**:
   - Feature description and user story
   - API contract (endpoints, request/response)
   - Database schema changes (if any)
   - UI components needed
   - Acceptance criteria
3. **Review the spec** - Discuss and refine before implementation
4. **Reference the spec** in commits and PRs

### When to Create a Spec

| Requires Spec | No Spec Needed |
|---------------|----------------|
| New feature | Bug fix |
| New API endpoint | Typo fix |
| Database schema change | Config change |
| UI flow/page | Dependency update |
| Integration with external service | Refactoring (same behavior) |

### SpecKit Commands

```bash
# Create a new spec
npx speckit create "feature-name"

# List specs
npx speckit list

# View a spec
npx speckit view "feature-name"
```

---

### Architecture Principle: API-First

**ALWAYS build API-first.** This means:

1. **Design the API endpoint first** - Define the contract before building UI
2. **API routes are the source of truth** - All business logic lives in `/api/` routes
3. **Frontend consumes APIs** - UI components fetch from API endpoints, never direct DB access from client
4. **Enable headless usage** - Every feature must be accessible via API (for MCP, CLI, integrations)

```text
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Routes │────▶│  Database   │
│  (Next.js)  │     │  /api/*     │     │  (Supabase) │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Services   │
                    │  (AWS, AI)  │
                    └─────────────┘
```

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

```text
src/
├── app/              # Next.js App Router pages and API routes
│   ├── api/          # API endpoints (API-First: all business logic here)
│   ├── (routes)/     # Page routes
│   └── layout.tsx    # Root layout
├── components/       # React components
│   ├── ui/           # shadcn/ui components (Button, Card, Dialog, etc.)
│   └── features/     # Feature-specific components
├── lib/              # Shared utilities and services
│   ├── aws/          # AWS SDK utilities
│   ├── cloudformation/  # CF generation/validation
│   ├── database/     # Supabase client
│   ├── rag/          # Pinecone RAG utilities
│   └── utils.ts      # General utilities (cn, etc.)
└── hooks/            # Custom React hooks
```

### UI Components (shadcn/ui)

Always use shadcn/ui for UI components:

```bash
npx shadcn@latest add button card dialog form input
```

- Install components as needed with `npx shadcn@latest add <component>`
- Components go in `src/components/ui/`
- Use `cn()` utility for conditional classes
- Follow shadcn/ui patterns for consistency

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
