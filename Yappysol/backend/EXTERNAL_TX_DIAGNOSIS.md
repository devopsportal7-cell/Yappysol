# External Transactions Table Empty - Diagnosis

## Current Status

- ✅ **wallet_balance_cache** table IS being updated (visible in database)
- ❌ **external_transactions** table IS EMPTY (visible in database)

## Why This Happens

### Balance Cache Updates (Working)

The `wallet_balance_cache` table is updated by **multiple mechanisms**:

1. **WebSocket Account Notifications** (Primary)
   - Location: `WebsocketBalanceSubscriber.ts` lines 70-85
   - Trigger: When account balance changes on-chain
   - Action: Calls `requestWalletRefresh()` → updates cache via Helius API

2. **Portfolio Refresh Service** (Secondary)
   - Location: `portfolio-refresh.ts` line 50-53
   - Trigger: Manual refresh requests
   - Action: Fetches from Helius and updates cache

3. **Background Update Service** (Optional - disabled by default)
   - Location: `BackgroundBalanceUpdateService.ts` line 151
   - Trigger: Scheduled polling (every 1 hour if enabled)
   - Action: Updates all wallets periodically

**This is why you see updates in wallet_balance_cache** ✅

### External Transactions NOT Stored (Not Working)

The `external_transactions` table should be populated by:

1. **WebSocket Detection** (Lines 78-81 in WebsocketBalanceSubscriber.ts)
   ```typescript
   await this.checkForExternalTransactions(walletAddress, notificationReceivedTimestamp);
   ```

2. **External Transaction Service** (ExternalTransactionService.ts)
   - Gets transactions from Helius API
   - Filters for "incoming" transactions
   - Stores them in database

## Why It's Failing - Most Likely Reasons

### 1. Helius API Errors (Most Likely)

Check your backend logs for:
```
[EXTERNAL_TX] Error fetching transactions from Helius
```

The `getRecentTransactions()` method might be failing due to:
- Rate limiting (429 errors)
- Invalid API key
- Empty response from Helius
- Network timeouts

### 2. Filtering Too Strict

The code filters transactions with these conditions:
```typescript
const isIncoming = this.isIncomingTransaction(tx, walletAddress);
const isFinalized = tx.confirmationStatus === 'finalized';
const hasNoError = !tx.err;
const isFromExternal = !this.platformWallets.includes(tx.accounts[0]);
```

If any of these fail, the transaction won't be stored.

### 3. User ID Lookup Failing

After finding transactions, the code needs to get the user ID:
```typescript
const userId = await externalTransactionService.getUserIdByWallet(walletAddress);
if (userId) {
  for (const tx of externalTxs) {
    await externalTransactionService.storeExternalTransaction(tx, userId, ...);
  }
}
```

If `getUserIdByWallet()` returns null, transactions won't be stored.

### 4. WebSocket Not Running

If the WebSocket isn't connected, transactions won't be detected at all. Check logs for:
```
[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!
```

## How to Verify and Fix

### Step 1: Check Backend Logs

Look for these log patterns:

```
[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!
[WSS] 🔍 Checking for external transactions...
[EXTERNAL_TX] Checking for external deposits for wallet: <address>
[EXTERNAL_TX] Fetched X total transactions from Helius
[EXTERNAL_TX] Found X new external transactions
[EXTERNAL_TX] Stored external transaction
```

If you DON'T see these logs, the WebSocket isn't running or transactions aren't being detected.

### Step 2: Check Helius API

The `getRecentTransactions()` method (line 88-149 in ExternalTransactionService.ts) might be failing. Look for:

```
[EXTERNAL_TX] Error fetching transactions from Helius
```

Or check if you're hitting rate limits:
```
Error: Too Many Requests
```

### Step 3: Verify Database Write

The `storeExternalTransaction()` method (line 200-257) writes to the database. Check for:

```
[EXTERNAL_TX] Error storing external transaction
```

### Step 4: Manual Test

You can manually trigger external transaction detection by calling the diagnostics endpoint:

```
POST /api/diagnostics/check-transactions
Body: { "walletAddress": "YOUR_WALLET_ADDRESS" }
```

This will force a check and should populate the table if transactions exist.

## Quick Fix Recommendations

### 1. Check if WebSocket is Connected

Run:
```bash
GET /api/diagnostics/websocket
```

Should show `isConnected: true`

### 2. Add More Logging

The code already has logging, but you might need to add more specific error handling. I can add this if needed.

### 3. Test with Manual Trigger

Use the diagnostics endpoint to manually check:
```bash
curl -X POST http://your-backend/api/diagnostics/check-transactions \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "YOUR_ADDRESS"}'
```

## Conclusion

The **most likely issue** is that the Helius API call in `getRecentTransactions()` is failing silently, or the WebSocket isn't detecting account changes. The balance cache updates because it uses a different, more reliable path through the Helius Balance Service API.

## Next Steps

1. Check Render logs for errors during transaction detection
2. Verify WebSocket is connected (`GET /api/diagnostics/websocket`)
3. Manually trigger external transaction check
4. Add more error logging if needed

Would you like me to add more detailed logging or implement a fallback detection mechanism?

