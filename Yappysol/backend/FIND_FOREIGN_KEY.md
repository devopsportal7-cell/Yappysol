# Find Foreign Key Constraint - Simpler Query

Run this query instead:

```sql
SELECT 
    conname as constraint_name,
    conrelid::regclass as table_name,
    confrelid::regclass as foreign_table_name
FROM pg_constraint
WHERE conrelid = 'external_transactions'::regclass
AND contype = 'f';
```

This will show:
- `constraint_name`: The name of the foreign key
- `table_name`: The table it's on (`external_transactions`)
- `foreign_table_name`: The table it references

Expected result:
```
constraint_name: external_transactions_user_id_fkey
table_name: external_transactions
foreign_table_name: users
```

If you see a different `foreign_table_name` (not `users`), that's the problem!
