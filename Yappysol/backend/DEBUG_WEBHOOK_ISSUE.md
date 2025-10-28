# Webhook Transaction Storage Issue - Root Cause Found

## Problem

The webhook is receiving transactions correctly, but failing to store them with this error:

```
error: insert or update on table "external_transactions" violates foreign key constraint "external_transactions_user_id_fkey"
Key (user_id)=(29cd89ae-6ad3-45f3-a09b-58e763f4cd25) is not present in table "users"
```

## Root Cause

The `wallets` table has this record:
```
public_key: 9yQvxn1h2hDdHkhLxaY3UUFQPTyPvY1DhaMfqyZb1TPN
user_id: 29cd89ae-6ad3-45f3-a09b-58e763f4cd25
```

But this `user_id` **does not exist** in the `users` table, causing the foreign key constraint to fail.

## Why This Happens

This scenario occurs when:
1. **User was deleted** but wallets remain (orphaned wallets)
2. **Wallet was created incorrectly** with invalid user_id
3. **Privy user** was created but not properly synced with Supabase users table

## Solution Options

### Option 1: Check if User Exists
Run this query in Supabase SQL Editor:

```sql
SELECT * FROM users WHERE id = '29cd89ae-6ad3-45f3-a09b-58e763f4cd25';
```

If this returns **no results**, the user doesn't exist.

### Option 2: Make User Foreign Key Optional (Quick Fix)
Temporarily disable foreign key constraint for testing:

```sql
-- Check current constraints
SELECT constraint_name, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'external_transactions' 
AND constraint_type = 'FOREIGN KEY';

-- ALTER TABLE to make user_id nullable and remove foreign key
ALTER TABLE external_transactions 
DROP CONSTRAINT external_transactions_user_id_fkey;
```

**⚠️ WARNING**: This removes data integrity protection.

### Option 3: Fix the Data (Proper Solution)
1. **If user should exist:** Create the user in the `users` table
2. **If user shouldn't exist:** Delete the orphaned wallet
3. **If this is Privy user:** Sync Privy user to Supabase users table

## Recommended Fix

Since this is a **newly created account**, the issue is likely that the user creation flow isn't properly inserting into the `users` table. 

Check your authentication flow - is the user being created in Supabase when they sign up?

### Verify Current Status

Run these queries:

```sql
-- 1. Check if user exists
SELECT * FROM users WHERE id = '29cd89ae-6ad3-45f3-a09b-58e763f4cd25';

-- 2. Check all recent users
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;

-- 3. Check all wallets for orphaned records
SELECT w.public_key, w.user_id, u.email 
FROM wallets w 
LEFT JOIN users u ON w.user_id = u.id 
WHERE u.id IS NULL;
```

## Temporary Workaround (For Testing)

If you need transactions to work immediately while fixing the root cause, add error handling that ignores orphaned wallets:

```typescript
// In webhooks.ts, before storing transaction
const userId = await externalTransactionService.getUserIdByWallet(walletAddress);

if (!userId) {
  logger.error('[WEBHOOK] Cannot store transaction - wallet has no valid user_id', { 
    walletAddress,
    error: 'Orphaned wallet (user does not exist)'
  });
  return; // Skip storing transaction
}

// Verify user exists
const { data: userExists } = await supabase
  .from('users')
  .select('id')
  .eq('id', userId)
  .single();

if (!userExists) {
  logger.error('[WEBHOOK] Cannot store transaction - user_id does not exist in users table', { 
    walletAddress,
    userId
  });
  return; // Skip storing transaction
}
```

Then at least you'll see the transactions in logs and can debug the user creation issue separately.
