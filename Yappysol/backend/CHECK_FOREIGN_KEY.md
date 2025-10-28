# Check Foreign Key Constraint

## User EXISTS in Database

Great! The user exists:
- id: `29cd89ae-6ad3-45f3-a09b-58e763f4cd25`
- email: `bukolajolaoshogab@gmail.com`
- created: `2025-09-20`

## Problem: Foreign Key Constraint Failing

The foreign key constraint says the user doesn't exist, but it clearly does. This suggests the **foreign key constraint is pointing to the wrong column**.

## Check the Foreign Key Constraint

Run this query in Supabase SQL Editor:

```sql
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_name = 'external_transactions';
```

This will show you what the `external_transactions_user_id_fkey` constraint is actually pointing to.

## Expected Result

You should see:
- `column_name`: `user_id`
- `foreign_table_name`: `users`
- `foreign_column_name`: `id`

If `foreign_column_name` is NOT `id`, that's the problem!

## Fix the Foreign Key

If the foreign key is pointing to the wrong column, drop and recreate it:

```sql
-- Drop the old constraint
ALTER TABLE external_transactions 
DROP CONSTRAINT external_transactions_user_id_fkey;

-- Recreate it pointing to the correct column
ALTER TABLE external_transactions
ADD CONSTRAINT external_transactions_user_id_fkey
FOREIGN KEY (user_id) REFERENCES users(id);
```

## Quick Test

After fixing, run this to test:

```sql
-- Try to insert a test transaction
INSERT INTO external_transactions (
    user_id,
    signature,
    block_time,
    amount,
    token_mint,
    token_symbol,
    sender,
    recipient,
    type,
    solscan_url
) VALUES (
    '29cd89ae-6ad3-45f3-a09b-58e763f4cd25',
    'test-signature-123',
    1761674517,
    0.005,
    'So11111111111111111111111111111111111111112',
    'SOL',
    'sender-address',
    'recipient-address',
    'SOL',
    'https://solscan.io/tx/test'
);

-- Then delete it
DELETE FROM external_transactions WHERE signature = 'test-signature-123';
```

If this works without errors, the constraint is fixed!
