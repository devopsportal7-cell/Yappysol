# How Webhook Address Adding Works

## Current Status: **Manual Setup Only**

The webhook exists in Helius dashboard with 2 addresses. The code is designed for automatic management but currently returns `null` (400 errors).

## How It SHOULD Work (Code Design)

### 1. **On App Startup** (Lines 110-118 in app.ts)
```typescript
await heliusWebhookService.initializeWithAllWallets();
```

This should:
- ✅ Find the existing webhook in Helius
- ✅ Fetch ALL active wallets from database  
- ✅ Add ALL addresses to the webhook via `addWalletAddresses()`

### 2. **When New Wallet Created** (Lines 83-96 in WalletSupabase.ts)
```typescript
await heliusWebhookService.addWalletAddresses([publicKey]);
```

This should:
- ✅ Add the new wallet address to the webhook immediately

## Why Only 2 Addresses?

From the logs:
```
error: [HELIUS_WEBHOOK] Error initializing webhook {"status":400}
[HELIUS_WEBHOOK] Failed to initialize webhook
```

The code fails at step 1 (finding existing webhook), so it never gets to step 2 (adding addresses).

## Solutions

### Option 1: Manual Management (Current)
- Add/remove addresses in Helius dashboard
- Fully under your control
- No code dependencies

### Option 2: Fix Auto-Detection
- Deploy the latest code fixes
- Check Render logs for `[HELIUS_WEBHOOK] Using existing webhook`
- If it finds the webhook, addresses will auto-add

### Option 3: Programmatic Update Now
- Code will auto-add all addresses on next deployment
- Check logs after deploy

## To Verify What's Happening

After deploying the latest fixes, check Render logs for:

```
✅ Helius webhook service initialized
[HELIUS_WEBHOOK] Retrieved webhooks from Helius { count: X }
[HELIUS_WEBHOOK] Using existing webhook { webhookId: '...' }
[HELIUS_WEBHOOK] Adding wallet addresses to webhook { addressCount: 7 }
[HELIUS_WEBHOOK] Wallet addresses added successfully { addedCount: 7, totalAddresses: 7 }
```

## Current Recommendation

**For now:** Use Helius dashboard to manually manage addresses until we deploy the fix and verify it works.

**After deploy:** Check logs to confirm automatic adding is working.
