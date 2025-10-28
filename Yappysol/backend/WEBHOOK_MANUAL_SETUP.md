# Helius Webhook Manual Setup

## ✅ Confirmation from Helius Documentation

According to [Helius documentation](https://www.helius.dev/docs/api-reference/webhooks/), you can create webhooks in 3 ways:

1. **Helius Dashboard** (easiest)
2. **Helius API** (programmatic)
3. **Helius SDK** (TypeScript/Rust)

## 🎯 Recommended: Create Manually in Dashboard

The code attempts to create the webhook programmatically, but if it fails, create it manually:

### Step 1: Go to Helius Dashboard
1. Visit: https://dashboard.helius.dev/webhooks
2. Click "**Add Webhook**"

### Step 2: Configure Webhook
- **Webhook URL**: `https://yappysol.onrender.com/api/webhooks/helius`
- **Transaction Types**: `Any` (to catch deposits AND withdrawals)
- **Account Addresses**: Add your wallet addresses

### Step 3: Get Your Wallet Addresses

Run this query in Supabase SQL Editor:

```sql
SELECT public_key FROM wallets WHERE is_active = true;
```

Copy all the addresses and paste them into the Helius dashboard.

### Step 4: Create Webhook

Click "Create Webhook" in the Helius dashboard.

## 🔍 Verify Webhook Works

After creating, send a test deposit to one of your wallets and check Render logs for:

```
[WEBHOOK] Helius webhook received
[WEBHOOK] Processing account
[WEBHOOK] Native SOL transfer processed
```

## 📊 Check if Auto-Creation Succeeded

Check your Render logs for these messages:

### Success:
```
✅ Helius webhook service initialized - Transaction detection via webhooks enabled
[HELIUS_WEBHOOK] Webhook created successfully { webhookId: 'abc123...' }
```

### Failure:
```
❌ Error initializing Helius webhook: [error details]
[HELIUS_WEBHOOK] Error initializing webhook
```

If you see failure logs, create it manually in the dashboard.

## 🚀 After Manual Creation

Once the webhook exists in Helius dashboard:
- It will automatically receive transaction notifications
- No code changes needed
- Next time you deploy, the code will reuse the existing webhook

## 🎯 Why Manual Creation is Better

1. **More reliable** - Dashboard ensures correct configuration
2. **Easy to verify** - See webhook in Helius dashboard
3. **Easy to update** - Add/remove wallets via dashboard
4. **No rate limits** - Dashboard doesn't hit API rate limits during setup

The code will automatically detect and use this webhook on future deployments.
