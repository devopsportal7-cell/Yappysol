# Fix Foreign Key Constraint - Wrong Table Reference

## Problem Found

The foreign key constraint is pointing to the **WRONG TABLE**:
- Currently pointing to: `auth.users`
- Should point to: `public.users`

Your users are in `public.users`, but the constraint is checking `auth.users` (which doesn't have your user).

## Fix the Constraint

Run this SQL in Supabase:

```sql
-- 1. Drop the old constraint pointing to auth.users
ALTER TABLE external_transactions 
DROP CONSTRAINT external_transactions_user_id_fkey;

-- 2. Create new constraint pointing to public.users
ALTER TABLE external_transactions
ADD CONSTRAINT external_transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES public.users(id);
```

## Verify the Fix

Check the constraint is now pointing to the right table:

```sql
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table_name,
    a.attname as column_name,
    af.attname as foreign_column_name
FROM pg_constraint c
JOIN pg_attribute a ON a.attnum = ANY(c.conkey) AND a.attrelid = c.conrelid
JOIN pg_attribute af ON af.attnum = ANY(c.confkey) AND af.attrelid = c.confrelid
WHERE conrelid = 'external_transactions'::regclass
AND contype = 'f';
```

You should now see:
- `foreign_table_name`: `users` (not `auth.users`)

## After This Fix

Your webhook transactions will now be able to insert into the `external_transactions` table because the foreign key will correctly reference `public.users(id)`.
