# Webhook Setup - Next Steps

## ✅ You've Created Webhook in Dashboard

Great! Now the code will automatically:
1. Find your existing webhook
2. Add all current addresses from your database
3. Track transactions in real-time

## 🚀 Deploy the Code

Deploy to Render so the app can connect to your webhook:

```bash
git add .
git commit -m "Add Helius webhook integration"
git push
```

## 🔍 What Happens on Deploy

When the app starts on Render, watch the logs for:

### Step 1: Webhook Connection
```
✅ Helius webhook service initialized - Transaction detection via webhooks enabled
[HELIUS_WEBHOOK] Using existing webhook { webhookId: '...' }
```

### Step 2: Addresses Added
```
[HELIUS_WEBHOOK] Adding wallet addresses to webhook { addressCount: 7 }
[HELIUS_WEBHOOK] Wallet addresses added successfully { addedCount: 7, totalAddresses: 7 }
[HELIUS_WEBHOOK] Initialized with all user wallets { walletCount: 7 }
```

## 🧪 Test the Webhook

After deployment, send a test transaction:

1. **Send SOL** to one of your monitored wallets
2. **Check Render logs** for:
   ```
   [WEBHOOK] Helius webhook received
   [WEBHOOK] Native SOL transfer processed
   ```
3. **Check database** - transaction should appear in `external_transactions` table

## ✅ Auto-Add for New Addresses

When a user creates a new wallet, it will automatically add to webhook:

```typescript
// In WalletModel.createWallet() (line 84-96)
await heliusWebhookService.addWalletAddresses([publicKey]);
```

## 📊 Monitor Webhook

You can check in Helius dashboard anytime:
- https://dashboard.helius.dev/webhooks
- See how many addresses are monitored
- See webhook delivery status
- View recent webhook calls

## 🎯 Expected Behavior

- ✅ Deposits detected automatically
- ✅ Withdrawals detected automatically  
- ✅ Real-time updates to database
- ✅ Activity feed shows transactions
- ✅ New wallets auto-added to webhook

You're all set! Just deploy and test.
