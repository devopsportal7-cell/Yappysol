# Helius Webhook Testing Guide

## Why You Don't See Console Logs Yet

The webhook implementation was just added locally - it hasn't been deployed to Render yet.

### Current Status
- ✅ Code is ready
- ✅ Build passed
- ❌ Not deployed to Render
- ❌ Helius webhook not created yet

## How to Deploy and Test

### Step 1: Deploy the Code
```bash
cd Yappysol
git add .
git commit -m "Add Helius webhook for external transaction tracking"
git push
```

### Step 2: Check Deployment Logs

On Render, you should see these logs when the app starts:

```
✅ Helius webhook service initialized - Transaction detection via webhooks enabled
[HELIUS_WEBHOOK] Creating new webhook
[HELIUS_WEBHOOK] Webhook created successfully
[HELIUS_WEBHOOK] Initialized with all user wallets
```

### Step 3: Test the Webhook Endpoint

After deployment, test if the endpoint is accessible:

```bash
curl -X POST https://yappysol.onrender.com/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

Expected response:
```json
{
  "success": true,
  "processed": 0,
  "message": "Webhook processed successfully"
}
```

### Step 4: Check if Webhook Was Created

You should see in Render logs:
```
[HELIUS_WEBHOOK] Webhook created successfully { webhookId: "...abc..." }
[HELIUS_WEBHOOK] Initialized with all user wallets { webhookId: "...", walletCount: 7 }
```

### Step 5: Send a Test Transaction

1. Send SOL from another wallet to one of your monitored wallets
2. Check Render logs for:
```
[WEBHOOK] Helius webhook received
[WEBHOOK] Processing account
[WEBHOOK] Native SOL transfer processed
[EXTERNAL_TX] Stored webhook transaction
```

## What to Look For

### If Webhook Initialization Fails

Check logs for:
```
[HELIUS_WEBHOOK] Error initializing webhook
Error: HELIUS_API_KEY not configured
```

**Solution**: Ensure `HELIUS_API_KEY` is set in Doppler

### If Webhook Doesn't Receive Data

Check logs for:
```
❌ Error initializing Helius webhook: [error details]
```

**Possible causes**:
1. Helius API key invalid
2. Webhook URL not accessible from Helius
3. Rate limit on Helius API

### If Transactions Not Stored

Check logs for:
```
[WEBHOOK] Error processing account event
[EXTERNAL_TX] Error storing webhook transaction
```

**Check**:
1. Database connection working
2. `external_transactions` table exists
3. User ID lookup working

## Manual Webhook Creation (Fallback)

If automatic creation fails, you can manually create it:

1. Go to [Helius Dashboard](https://dashboard.helius.dev/webhooks)
2. Click "Create Webhook"
3. Set URL: `https://yappysol.onrender.com/api/webhooks/helius`
4. Set transaction type: **Enhanced**
5. Set accounts: (Leave empty - we add programmatically)

## Database Verification

Check if transactions are being stored:

```sql
SELECT * FROM external_transactions 
ORDER BY created_at DESC 
LIMIT 10;
```

Should show your deposits and withdrawals.
