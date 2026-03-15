# BillSaathi – Database Setup Guide

## Prerequisites
- A Supabase project (already connected via Lovable Cloud)

## Setup Steps

### 1. Run Schema
Execute `schema.sql` to create all tables in the correct dependency order.

### 2. Run Functions
Execute `functions.sql` to create security definer functions and triggers.

### 3. Run RLS Policies
Execute `rls_policies.sql` to enable Row Level Security on all tables.

### 4. Deploy Edge Functions
The following edge functions are auto-deployed by Lovable:
- `employee-auth` — Employee login with owner subscription validation
- `employee-data-proxy` — Scoped data access for employees (no Supabase Auth)
- `create-owner` — Super admin creates new business owners
- `get-admin-stats` — Aggregate stats for super admin dashboard

### 5. Create Super Admin Account
Manually create a user in Supabase Auth, then insert their profile:
```sql
INSERT INTO profiles (id, role, full_name, email)
VALUES ('<auth-user-id>', 'super_admin', 'Admin Name', 'admin@billsaathi.com');
```

### 6. Environment Variables
Set in `.env` (auto-configured by Lovable Cloud):
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

## Architecture Notes

### Multi-Tenant Isolation
- Every business data table has a `user_id` column referencing the owner's profile ID
- RLS policies enforce that owners only see their own data
- Employees access data via `employee-data-proxy` edge function scoped to `owner_id`
- Super admin can view all data for management

### Employee Authentication
- Employees do NOT have Supabase Auth accounts
- They authenticate via the `employee-auth` edge function
- All data access goes through `employee-data-proxy` using service role
- Owner subscription is validated on every employee request

### Invoice Number Sequences
- Each owner has independent sequences per document type per financial year
- The `get_next_sequence` function handles atomic increment
- Format: `PREFIX-FYFY-0001` (e.g., `INV-2526-0001`)
