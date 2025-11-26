# Create Feature Spec (SpecKit)

Create a new feature specification using GitHub SpecKit before implementation.

## Arguments

$ARGUMENTS - Feature name and brief description

## Process

### Step 1: Clarify Requirements

Before creating the spec, ensure you understand:

- What problem does this feature solve?
- Who is the user?
- What is the expected behavior?
- Are there any constraints or dependencies?

Ask clarifying questions if needed.

### Step 2: Create the Spec

Generate a spec with the following sections:

```markdown
# Feature: [Feature Name]

## Overview
Brief description of the feature and its purpose.

## User Story
As a [user type], I want to [action] so that [benefit].

## API Contract

### Endpoint: [METHOD] /api/[path]

**Request:**
```json
{
  "field": "type"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {}
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "message"
}
```

## Database Changes
- [ ] New table: `table_name`
- [ ] New column: `table.column`
- [ ] Migration file: `XXX_description.sql`

## UI Components
- [ ] Component 1 (shadcn/ui)
- [ ] Component 2

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Criterion 3

## Dependencies
- External services or APIs needed
- Other features this depends on

## Notes
Additional context or considerations.
```

### Step 3: Save the Spec

Save to `.speckit/[feature-name].md` or use SpecKit CLI:

```bash
npx speckit create "[feature-name]"
```

### Step 4: Review

Present the spec to the user for review and refinement before implementation.

## Important

- **Never skip the spec** for new features
- **API-First**: Define the API contract before UI
- **Database changes** must be documented
- **Acceptance criteria** are required

## Example Usage

```
/spec user-authentication Add magic link authentication for users
```
