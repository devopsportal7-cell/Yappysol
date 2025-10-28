# How to Verify Helius Webhook Was Created

## Step 1: Check Render Logs

After deployment, look for these log entries:

### ✅ Success Logs:
```
✅ Helius webhook service initialized - Transaction detection via webhooks enabled
[HELIUS_WEBHOOK] Creating new webhook { webhookUrl: 'https://yappysol.onrender.com/api/webhooks/helius' }
[HELIUS_WEBHOOK] Webhook created successfully { webhookId: 'abc123...' }
[HELIUS_WEBHOOK] Initialized with all user wallets { webhookId: '...', walletCount: 7 }
```

### ❌ Failure Logs:
```
❌ Error initializing Helius webhook: [error message]
[HELIUS_WEBHOOK] Error initializing webhook { error: 'API key invalid' }
```

## Step 2: Manual Verification

If you're not sure, check the Helius Dashboard:

1. Go to https://dashboard.helius.dev/webhooks
2. Look for a webhook with URL: `https://yappysol.onrender.com/api/webhooks/helius`
3. Check if it shows your wallet addresses

## Step 3: Create Manually if Needed

If automatic creation fails, manually create it:

1. Go to https://dashboard.helius.dev/webhooks
2. Click "Add Webhook"
3. Configure:
   - **Webhook URL**: `https://yappysol.onrender.com/api/webhooks/helius`
   - **Transaction Types**: `Any`
   - **Account Addresses**: (Add your wallet addresses)
4. Click "Create Webhook"

## Step 4: Test the Webhook

After webhook exists, test it:

```bash
curl -X POST https://yappysol.onrender.com/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

Expected response:
```json
{
  "success": true,
  "processed": 0
}
```

## Troubleshooting

### Webhook Not Created

**Possible causes:**
1. `HELIUS_API_KEY` not set in Doppler
2. Helius API rate limit
3. Webhook URL not accessible from Helius

**Solution:**
- Check Render logs for specific error
- Verify `HELIUS_API_KEY` in Doppler
- Create webhook manually in dashboard

### Webhook Created But Not Receiving Data

**Check:**
1. Wallet addresses are added to webhook in Helius dashboard
2. Webhook URL is correct and accessible
3. Backend server is running

**Solution:**
- Add wallet addresses manually in Helius dashboard
- Test webhook endpoint manually
- Check Render logs for incoming webhook requests

## Quick Diagnostic

Run this to check if webhook is working:

```bash
# 1. Check if endpoint is accessible
curl https://yappysol.onrender.com/api/webhooks/helius -X POST

# 2. Check Helius dashboard for webhook
# 3. Send a test transaction
# 4. Check Render logs for webhook reception
```
