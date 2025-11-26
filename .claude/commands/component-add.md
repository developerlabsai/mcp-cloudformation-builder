# Add Component to Library

Register a reusable component and sync it to the DeveloperLabs Scaffold library.

## Instructions

You just created or identified a reusable component. Now register it in the component library.

### Step 1: Identify the Component

Review the recent conversation or codebase and identify:
1. **Component name** - What is it called?
2. **File path** - Where does it live?
3. **Description** - What does it do?
4. **Dependencies** - What packages does it need?
5. **Usage example** - How do you use it?

### Step 2: Determine the Category

Choose the most appropriate category:
- `ui` - React UI components (buttons, cards, modals, forms)
- `backend` - Server-side utilities (API helpers, middleware)
- `api` - API route patterns or handlers
- `utility` - General utility functions
- `hook` - Custom React hooks
- `provider` - Context providers or wrappers

### Step 3: Gather Component Information

Collect this information:

```typescript
{
  name: 'ComponentName',           // PascalCase for UI, camelCase for utilities
  description: 'What this component does and when to use it',
  category: 'ui' | 'backend' | 'api' | 'utility' | 'hook' | 'provider',
  code: '// The full component code',
  filePath: 'src/components/ui/ComponentName.tsx',
  dependencies: ['react', '@radix-ui/react-dialog'],  // npm packages required
  tags: ['modal', 'dialog', 'overlay', 'shadcn'],
  usage: '// Example of how to use it',
}
```

### Step 4: Register via API

Call the component registration API:

```bash
curl -X POST http://localhost:3000/api/library/components \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "ComponentName",
    "description": "Description here",
    "category": "ui",
    "code": "// component code",
    "filePath": "src/components/ui/ComponentName.tsx",
    "dependencies": ["react"],
    "tags": ["tag1", "tag2"]
  }'
```

Or use the Supabase client directly if authenticated.

### Step 5: Verify Registration

After registering:
1. Confirm the component was saved to the `components` table
2. Check if it was synced to scaffold (`synced_to_scaffold: true`)
3. If sync failed, note that it will retry on next deployment

---

## Component Categories Explained

### UI Components (`ui`)
React components for the user interface:
- Buttons, Cards, Dialogs, Forms
- Data display (Tables, Lists, Badges)
- Navigation (Tabs, Menus, Breadcrumbs)
- Feedback (Toasts, Alerts, Progress)

**Example:**
```typescript
{
  name: 'ConfirmDialog',
  category: 'ui',
  description: 'A reusable confirmation dialog with customizable actions',
  tags: ['dialog', 'modal', 'confirm', 'shadcn'],
}
```

### Backend Components (`backend`)
Server-side utilities and helpers:
- Database query builders
- Authentication middleware
- Validation schemas
- Error handlers

**Example:**
```typescript
{
  name: 'withAuth',
  category: 'backend',
  description: 'Middleware that verifies authentication before processing API requests',
  tags: ['middleware', 'auth', 'api', 'supabase'],
}
```

### API Patterns (`api`)
Reusable API route patterns:
- CRUD endpoint templates
- Webhook handlers
- Rate limiting patterns

**Example:**
```typescript
{
  name: 'crudEndpoint',
  category: 'api',
  description: 'Template for creating standard CRUD API endpoints with validation',
  tags: ['crud', 'api', 'rest', 'zod'],
}
```

### Hooks (`hook`)
Custom React hooks:
- Data fetching hooks
- Form handling hooks
- State management hooks

**Example:**
```typescript
{
  name: 'useAsync',
  category: 'hook',
  description: 'Hook for handling async operations with loading/error states',
  tags: ['async', 'loading', 'error', 'state'],
}
```

### Providers (`provider`)
Context providers and wrappers:
- Theme providers
- Auth providers
- Feature flag providers

**Example:**
```typescript
{
  name: 'AuthProvider',
  category: 'provider',
  description: 'Provides authentication context and session management',
  tags: ['auth', 'context', 'session', 'supabase'],
}
```

---

## Auto-Sync to Scaffold

When `SCAFFOLD_API_TOKEN` is configured, components automatically sync to `https://create.developerlabs.ai`.

This enables:
- **Reuse across projects** - Pull components into new projects
- **Version tracking** - See component history
- **Discovery** - Search the component library
- **Documentation** - Auto-generated component docs

---

**Now identify the component from the conversation above and register it.**
