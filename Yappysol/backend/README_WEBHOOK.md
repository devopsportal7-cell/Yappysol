# Helius Webhook Setup

## Status: Manual Creation Required

The code attempts to create the webhook automatically, but **you should create it manually in the Helius Dashboard** for reliability.

## Quick Setup

1. Go to: https://dashboard.helius.dev/webhooks
2. Click "Add Webhook"
3. Set URL: `https://yappysol.onrender.com/api/webhooks/helius`
4. Set Transaction Types: `Any`
5. Add your wallet addresses (get them from Supabase `wallets` table)
6. Click "Create Webhook"

## Get Your Wallet Addresses

Run in Supabase SQL Editor:
```sql
SELECT public_key FROM wallets WHERE is_active = true;
```

## Verify Setup

After creating, check Render logs when you send a transaction:
```
[WEBHOOK] Helius webhook received
```

That's it! The webhook will now track all deposits and withdrawals.
