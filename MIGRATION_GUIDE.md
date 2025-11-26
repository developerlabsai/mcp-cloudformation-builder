# MCP CloudFormation Builder - Database Migration Guide

**Date**: 2025-11-26

---

## 🗄️ **Database Setup for New Supabase Project**

This guide will help you set up the database for the MCP CloudFormation Builder in your new Supabase project.

---

## 📋 **Prerequisites**

1. New Supabase project created
2. Supabase CLI installed (`npm install -g supabase`)
3. Project credentials ready:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`

---

## 🚀 **Quick Start**

### **Step 1: Update Environment Variables**

Update `/Users/clancehoskin/Projects/mcp-cloudformation-builder/.env.local`:

```bash
# Replace these with your new Supabase project credentials
NEXT_PUBLIC_SUPABASE_URL=https://your-new-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-new-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-new-service-role-key
```

### **Step 2: Apply Migrations**

You have two options:

#### **Option A: SQL Editor (Recommended for first-time setup)**

1. Go to your Supabase Dashboard → SQL Editor
2. Run each migration file in order (001 → 010)
3. Files are located in: `/Users/clancehoskin/Projects/mcp-cloudformation-builder/supabase/migrations/`

#### **Option B: Supabase CLI**

```bash
cd /Users/clancehoskin/Projects/mcp-cloudformation-builder

# Link to your Supabase project
supabase link --project-ref your-project-ref

# Apply all migrations
supabase db push
```

---

## 📦 **Migration Files to Apply**

Apply in this order:

### **1. `013_pricing_cache.sql`**
**Purpose**: AWS pricing data cache (14-day TTL)
**Tables**: `pricing_cache`
**Critical**: Yes - Required for cost estimates

### **2. `014_feedback_system.sql`**
**Purpose**: Error patterns and user feedback
**Tables**: `error_solutions`, `feedback_submissions`
**Critical**: Yes - Required for self-healing pattern database

### **3. `018_terraform_generations.sql`**
**Purpose**: Terraform generation tracking
**Tables**: `terraform_generations`
**Critical**: No - Terraform not yet implemented (Phase 2)

### **4. `019_terraform_configs.sql`**
**Purpose**: Terraform configuration storage
**Tables**: `terraform_configs`
**Critical**: No - Terraform not yet implemented (Phase 2)

### **5. `020_user_github_analyses.sql`**
**Purpose**: GitHub repository analysis history
**Tables**: `user_github_analyses`
**Critical**: Yes - Required for repository analysis tracking

### **6. `021_cloudformation_templates.sql`** ⭐
**Purpose**: CloudFormation template storage
**Tables**: `cloudformation_templates`
**Critical**: **YES** - Core table for template generation

### **7. `022_template_deployment_logs.sql`**
**Purpose**: Deployment tracking and logs
**Tables**: `template_deployment_logs`
**Critical**: Yes - Required for self-healing and analytics

### **8. `023_template_auto_fixes.sql`** ⭐
**Purpose**: Self-healing patterns (MOAT)
**Tables**: `template_auto_fixes`
**Critical**: **YES** - Contains network effects moat (pattern database)

### **9. `024_repository_version_tracking.sql`**
**Purpose**: SpecKit cache and repository versioning
**Tables**: `repository_version_tracking`
**Critical**: Yes - Required for 45-day caching

### **10. `030_credit_system.sql`**
**Purpose**: Usage tracking and credit system
**Tables**: `partner_credits`, `credit_transactions`
**Critical**: No - Optional for MVP (can add later)

---

## ⚠️ **CRITICAL TABLES (Must Have)**

These tables are **required** for the MCP Builder to function:

1. **`cloudformation_templates`** - Stores generated templates
2. **`template_auto_fixes`** - Self-healing pattern database (99.5% accuracy)
3. **`error_solutions`** - Known error patterns
4. **`pricing_cache`** - AWS pricing data
5. **`repository_version_tracking`** - SpecKit cache
6. **`template_deployment_logs`** - Deployment history

---

## 🧪 **Verify Migrations**

After applying migrations, verify in SQL Editor:

```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should see:
-- cloudformation_templates
-- credit_transactions
-- error_solutions
-- feedback_submissions
-- partner_credits
-- pricing_cache
-- repository_version_tracking
-- template_auto_fixes
-- template_deployment_logs
-- terraform_configs
-- terraform_generations
-- user_github_analyses
```

---

## 🔐 **Row-Level Security (RLS)**

Some tables may need RLS policies. For MVP, you can disable RLS temporarily:

```sql
-- Disable RLS on all tables (development only)
ALTER TABLE cloudformation_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_auto_fixes DISABLE ROW LEVEL SECURITY;
ALTER TABLE error_solutions DISABLE ROW LEVEL SECURITY;
ALTER TABLE pricing_cache DISABLE ROW LEVEL SECURITY;
ALTER TABLE repository_version_tracking DISABLE ROW LEVEL SECURITY;
ALTER TABLE template_deployment_logs DISABLE ROW LEVEL SECURITY;
```

**Note**: For production, you should enable RLS with proper policies for multi-tenant isolation.

---

## 🎯 **Test Database Connection**

After migrations, test the connection:

```bash
cd /Users/clancehoskin/Projects/mcp-cloudformation-builder

# Start dev server
npm run dev

# In another terminal, test API
curl http://localhost:3001
```

---

## 📊 **Expected Table Counts After Migration**

- **Core tables**: 6 (cloudformation_templates, template_auto_fixes, error_solutions, pricing_cache, repository_version_tracking, template_deployment_logs)
- **Terraform tables**: 2 (terraform_generations, terraform_configs) - Optional
- **Credit system**: 2 (partner_credits, credit_transactions) - Optional
- **Feedback**: 1 (feedback_submissions) - Optional
- **User tracking**: 1 (user_github_analyses)

**Total**: 12 tables

---

## 🐛 **Troubleshooting**

### **Migration fails with "relation already exists"**

```sql
-- Drop and recreate (DESTRUCTIVE - only for fresh setup)
DROP TABLE IF EXISTS cloudformation_templates CASCADE;
-- Then re-run the migration
```

### **RLS errors when inserting data**

```sql
-- Check RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- Disable RLS temporarily (development)
ALTER TABLE table_name DISABLE ROW LEVEL SECURITY;
```

### **Connection errors**

- Verify environment variables in `.env.local`
- Check Supabase project is active
- Verify service role key has full access

---

## ✅ **Success Criteria**

Database setup is complete when:

- [ ] All 12 tables created successfully
- [ ] No RLS blocking errors (for development)
- [ ] Can insert test data into `cloudformation_templates`
- [ ] Pattern database (`template_auto_fixes`) is queryable
- [ ] MCP Builder server starts without database errors

---

## 📝 **Next Steps After Migration**

1. Update `.env.local` with new Supabase credentials
2. Restart MCP Builder dev server
3. Test internal API endpoints
4. Seed pattern database (optional)
5. Deploy to Vercel

---

**Questions?** Check the main README or contact: clance@developerlabs.ai
