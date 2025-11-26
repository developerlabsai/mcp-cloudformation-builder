# Push Database Migrations

Push all pending Supabase migrations to the remote database.

## Steps:
1. List current migrations in `supabase/migrations/`
2. Run `supabase db push`
3. Confirm migrations applied successfully
4. Report any errors and suggest fixes

## Safety:
- Always confirm with user before pushing
- Check for destructive changes (DROP, DELETE)
