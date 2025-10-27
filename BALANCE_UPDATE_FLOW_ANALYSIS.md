# Balance Update Flow Analysis

## How Your Balance Updated

When you transferred SOL to your wallet, here's what happened:

### Flow 1: WebSocket Detection (Preferred - Real-time) ✅

1. **Solana WebSocket Subscription** (`WebsocketBalanceSubscriber.ts`)
   - Subscribes to wallet account changes
   - Receives real-time notifications when balance changes
   - Detects: `accountNotification` event (lines 117-157)

2. **When Balance Changed:**
   ```
   Solana Blockhain Event
   ↓
   WebSocket: accountNotification received
   ↓
   Check for external transactions (line 139)
   ↓
   Fetch transactions from Helius API
   ↓
   Store new transactions in database (external_transactions table)
   ↓
   Trigger balance refresh (line 142-143)
   ↓
   Fetch fresh balance from Helius
   ↓
   Update cache in database
   ↓
   Notify frontend via WebSocket
   ↓
   Balance appears on your UI!
   ```

### Flow 2: Manual Refresh (When You Clicked Refresh)

1. **Frontend calls** `/api/wallet/refresh` or `/api/portfolio/:address`
2. **Backend:**
   - Calls `heliusBalanceService.getWalletPortfolio(walletAddress)` 
   - Fetches fresh data from Helius API (blocks latest data)
   - Updates cache in database
   - Returns to frontend
3. **Balance updates**

## Why Transaction Might Not Be in Database

### Possible Reasons:

1. **WebSocket didn't trigger** (connection issue)
   - Check: Is WebSocket connected? Look for `[WSS] Connected to Solana WebSocket`
   - If disconnected, manual refresh will still work

2. **Transaction not stored**
   - The `checkForExternalTransactions()` method in WebsocketBalanceSubscriber (line 139) is called
   - But it only checks for "incoming" transactions (deposits)
   - It filters by:
     - Must be incoming (wallet is recipient)
     - Must be external (not from platform wallets)
     - Must not already exist in database

3. **Database schema missing**
   - The `external_transactions` table might not exist
   - Need to check if table was created

### How to Verify:

Check your logs for these patterns:

```
[WSS] Account change detected, refreshing balance cache
[WSS] Checking for external transactions
[EXTERNAL_TX] Found X new external transactions
[EXTERNAL_TX] Stored external transaction
```

If you see these logs, the transaction SHOULD be in the database.

## Where Transaction Data Is Stored

### Database Tables:
1. **`portfolio_cache`** - Stores wallet balance data
   - `wallet_address`, `total_sol_value`, `total_usd_value`
   - Updated when balance changes

2. **`external_transactions`** - Stores transaction history  
   - `signature`, `sender`, `recipient`, `amount`, `token_symbol`
   - Should contain all external deposits/withdrawals

3. **`token_balance_cache`** - Individual token balances
   - For each token in the wallet

## How to Check If Transactions Are Being Stored

Run this query in Supabase:

```sql
SELECT * FROM external_transactions 
WHERE recipient = 'YOUR_WALLET_ADDRESS'
ORDER BY block_time DESC 
LIMIT 10;
```

If this returns empty, the transactions aren't being stored.

## Current Issue: Transactions Not Being Detected

Based on your description:
- ✅ Balance updated correctly (Helius fetches work)
- ❌ Transaction not in database (detection failed)

**Possible causes:**
1. `getRecentTransactions()` in ExternalTransactionService might be failing
2. `checkForExternalDeposits()` filtering might be too strict
3. Database table not created
4. WebSocket not connected to your wallet

## Solution: Add Better Logging & Detection

I can add:
1. More detailed logging to track when transactions should be stored
2. Fallback to check transactions on every balance refresh
3. Manual trigger to scan for missed transactions

Would you like me to implement this?

