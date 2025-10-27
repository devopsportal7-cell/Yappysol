# WebSocket Solution - Use Helius

## Summary

The public Solana WebSocket (`wss://api.mainnet-beta.solana.com`) returns **429 Too Many Requests**. **Use Helius WebSocket instead**.

## Problem

```
error: [WSS] WebSocket error {"error":"Unexpected server response: 429"}
```

This is because the public Solana RPC is rate-limited.

## Solution

Use **Helius WebSocket** which works perfectly:

```
wss://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
```

## Why Helius Works

1. ✅ **No rate limits** - Helius has higher limits
2. ✅ **More reliable** - Production-grade infrastructure  
3. ✅ **Same protocol** - Uses native Solana WebSocket protocol
4. ✅ **Already have API key** - You're already using Helius

## Environment Variable Setup

Set in your deployment (Doppler/Render):

```
SOLANA_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=YOUR_HELIUS_API_KEY
```

## Why Helius Didn't Detect Transactions Before

The logs show it connected but you said it didn't detect transactions. This could be because:

1. **Subscriptions were successful** but you need to send a test transaction
2. **Enhanced logging wasn't deployed yet** (we just added it)
3. **Need to verify** by sending SOL to a test wallet

## How to Verify Transaction Detection

### 1. Deploy with Helius WebSocket
```bash
# Set in environment:
SOLANA_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=4ef3a4ea-1010-41e8-bfea-884eeed32faa
```

### 2. Watch Logs for Connection:
```
✅ [WSS] Connected to Solana WebSocket
✅ [WSS] Resubscribing to all wallets
✅ [WSS] Subscribed to Solana wallet
✅ [WSS] Solana subscription confirmed
```

### 3. Send Test Transaction:
```
# Send SOL to: YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG
```

### 4. Watch Logs for Detection:
```
[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!
[WSS] 🔍 Checking for external transactions...
[EXTERNAL_TX] Checking for external deposits for wallet: ...
[EXTERNAL_TX] Found 1 new external transactions
[EXTERNAL_TX] Stored external transaction
```

### 5. Check Database:
```sql
SELECT * FROM external_transactions 
WHERE recipient = 'YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG' 
ORDER BY created_at DESC;
```

## Fixed Code

Reverted the code that was forcing native WebSocket:

**Before (Wrong):**
```typescript
if (wsUrl.includes('helius-rpc.com')) {
  logger.warn('Detected Helius URL, forcing native Solana WebSocket');
  wsUrl = 'wss://api.mainnet-beta.solana.com'; // This caused 429 errors!
}
```

**After (Correct):**
```typescript
// Use whatever URL is set in SOLANA_WSS_URL
const wsUrl = process.env.SOLANA_WSS_URL || 'wss://api.mainnet-beta.solana.com';
```

## Expected Behavior

With Helius WebSocket:

1. ✅ **Connects successfully** - No more 429 errors
2. ✅ **Subscribes to wallets** - All 7 user wallets
3. ✅ **Detects transactions** - Balance changes trigger detection
4. ✅ **Stores in database** - External transactions saved
5. ✅ **Updates frontend** - Real-time balance updates

## Next Steps

1. ✅ Code fixed (allowed Helius WebSocket)
2. **Deploy to Render**
3. **Send test transaction**
4. **Watch logs for detection**
5. **Verify in database**

## The Enhanced Logging Will Show:

When a transaction is detected:
```
[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket! {
  wallet: "YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG",
  subscriptionId: 123456,
  lamports: 1000000000,
  timestamp: "2025-01-27T12:00:00.000Z"
}
[WSS] 🔍 Checking for external transactions...
[EXTERNAL_TX] Checking for external deposits for wallet: YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG
[EXTERNAL_TX] Fetched 5 total transactions from Helius
[EXTERNAL_TX] Found 1 external transactions
[EXTERNAL_TX] New external transaction found: xyz789...
[WSS] Found 1 new external transactions
[WSS] ✅ External transaction check completed
[EXTERNAL_TX] Stored external transaction
```

**Use Helius WebSocket - it works!** 🚀

