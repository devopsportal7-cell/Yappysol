# How to Verify Webhook Has Your Addresses

## What Already Happens on App Startup

When your app starts (after deployment), it automatically:

1. ✅ Creates/finds webhook in Helius
2. ✅ Fetches all wallet addresses from database  
3. ✅ Adds ALL addresses to the webhook
4. ✅ Logs success/failure

## Check Render Logs After Deployment

Look for these messages in your Render logs:

### ✅ Success (Addresses Added):
```
✅ Helius webhook service initialized - Transaction detection via webhooks enabled
[HELIUS_WEBHOOK] Creating new webhook { webhookUrl: 'https://yappysol.onrender.com/api/webhooks/helius' }
[HELIUS_WEBHOOK] Webhook created successfully { webhookId: '...' }
[HELIUS_WEBHOOK] Adding wallet addresses to webhook { webhookId: '...', addressCount: 7 }
[HELIUS_WEBHOOK] Wallet addresses added successfully { webhookId: '...', addedCount: 7, totalAddresses: 7 }
[HELIUS_WEBHOOK] Initialized with all user wallets { webhookId: '...', walletCount: 7 }
```

### ❌ Failure (Need Manual Setup):
```
❌ Error initializing Helius webhook: [error message]
[HELIUS_WEBHOOK] Error initializing webhook { error: '...', status: 401 }
```

## Manual Verification (Helius Dashboard)

1. Go to: https://dashboard.helius.dev/webhooks
2. Find your webhook (URL: `https://yappysol.onrender.com/api/webhooks/helius`)
3. Click to view details
4. Check "Account Addresses" - you should see all your wallet addresses listed

## Quick Test

After deployment, send SOL to one of your wallets and check Render logs:

```
[WEBHOOK] Helius webhook received { type: '...', accountDataCount: 1 }
[WEBHOOK] Processing webhook events
[WEBHOOK] Native SOL transfer processed
```

If you see this, the webhook is working and has your addresses!

## If Auto-Add Failed

If the automatic addition failed (check logs), you can:

**Option 1: Create webhook manually in Helius dashboard**
- Go to https://dashboard.helius.dev/webhooks
- Click "Add Webhook"
- Add all addresses manually

**Option 2: Trigger re-initialization** (requires code change)
- Could add an admin endpoint to manually trigger `initializeWithAllWallets()`
- Or redeploy the app to trigger automatic initialization again
