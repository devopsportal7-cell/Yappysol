# Fix: User Missing from Users Table

## The Problem

Your wallet has:
```
public_key: 9yQvxn1h2hDdHkhLxaY3UUFQPTyPvY1DhaMfqyZb1TPN
user_id: 29cd89ae-6ad3-45f3-a09b-58e763f4cd25
```

But this user doesn't exist in the `users` table.

## Check If User Exists

Run this query in Supabase SQL Editor:

```sql
SELECT * FROM users WHERE id = '29cd89ae-6ad3-45f3-a09b-58e763f4cd25';
```

If this returns **nothing**, the user doesn't exist.

## Check Your Users Table

```sql
SELECT id, email, created_at FROM users ORDER BY created_at DESC LIMIT 10;
```

This will show you if:
1. There are ANY users in the table
2. What the recent users are

## Check Your Wallets Table

```sql
SELECT w.public_key, w.user_id, u.email, u.id as user_exists
FROM wallets w 
LEFT JOIN users u ON w.user_id = u.id 
ORDER BY w.created_at DESC 
LIMIT 10;
```

This will show you:
- Which wallets have valid users (user_exists will have a value)
- Which wallets have orphaned users (user_exists will be NULL)

## The Issue

When you created the new account, either:
1. The user was never inserted into the `users` table
2. The wallet was created with a wrong `user_id`

## Solution

Based on the query results:

### If User Should Exist:
The user creation is failing. Check your registration/login flow.

### If User Shouldn't Exist:
Delete the orphaned wallet:

```sql
DELETE FROM wallets WHERE user_id = '29cd89ae-6ad3-45f3-a09b-58e763f4cd25';
```

### For Immediate Testing:
Run the queries above to find out what's in your tables, then we can fix it properly.
