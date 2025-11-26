# Add Database Migration

Create a new Supabase migration file.

## Arguments:
$ARGUMENTS - Description of the migration (e.g., "add user preferences table")

## Steps:
1. List existing migrations to get next number
2. Generate migration filename: `{NNN}_{snake_case_name}.sql`
3. Create migration file with:
   - Comment header with description
   - CREATE TABLE or ALTER statements
   - Indexes if needed
   - RLS policies
4. Show the migration to user for review
5. Ask if they want to push immediately

## Template:
```sql
-- Migration: {description}
-- Created: {date}

-- Your SQL here

-- Enable RLS
ALTER TABLE {table_name} ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "..." ON {table_name} ...
```
