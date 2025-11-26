# Add Solution to Knowledge Base

Capture the solution that was just discovered and add it to the knowledge base.

## Instructions

You just helped solve a problem. Now capture that solution for the knowledge base.

### Step 1: Identify the Solution Context

Review the recent conversation and identify:
1. **What was the problem?** (error message, unexpected behavior, etc.)
2. **What caused it?** (root cause)
3. **What was the solution?** (steps taken to fix it)
4. **Any code examples?** (before/after if applicable)

### Step 2: Determine the Category

Choose the most appropriate category:
- `nextjs` - Next.js framework issues
- `supabase` - Supabase/database issues
- `typescript` - TypeScript compilation/type errors
- `vercel` - Deployment issues
- `react` - React component issues
- `database` - SQL/migration issues
- `auth` - Authentication issues
- `aws` - AWS SDK/service issues
- `cloudformation` - CloudFormation template issues
- `general` - Everything else

### Step 3: Add the Entry

1. Read `src/lib/knowledgebase/entries.ts` to get the current entries
2. Determine the next ID number for the category (e.g., if `nextjs-002` exists, use `nextjs-003`)
3. Add the new entry to the array following this format:

```typescript
{
  id: '{category}-{number}',
  category: '{category}',
  title: 'Short descriptive title',
  problem: 'Detailed description of when this problem occurs and symptoms',
  errorMessages: ['exact error message 1', 'exact error message 2'],
  solution: `Step-by-step solution:

1. First step
2. Second step
3. Third step`,
  codeExample: `// Before (broken)
code here

// After (fixed)
code here`,
  relatedFiles: ['src/path/to/relevant/file.ts'],
  tags: ['searchable', 'keywords', 'for', 'this', 'issue'],
  dateAdded: '${new Date().toISOString().split('T')[0]}',
}
```

### Step 4: Confirm Addition

After adding the entry:
1. Show the user the entry that was added
2. Confirm it was saved to `entries.ts`
3. Note that it will auto-sync to scaffold when the API is called (or on next deployment)

### Step 5: Offer API Sync (Optional)

Ask if the user wants to immediately sync to the scaffold via the API:
- This requires `SCAFFOLD_API_TOKEN` to be configured
- If not configured, the entry is saved locally and will sync later

---

**Now review the conversation above and create the KB entry for the solution that was just discovered.**
