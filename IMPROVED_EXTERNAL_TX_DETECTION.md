# Improved External Transaction Detection

## Current Issue

You received SOL in your wallet:
- ✅ Balance updated correctly (Helius API fetch works)
- ❌ Transaction NOT stored in `external_transactions` table
- ❌ Transaction doesn't appear in activity feed

## Root Cause Analysis

### Why Transaction Detection Failed:

1. **WebSocket Connection Issues**
   - The WebSocket might not be connected
   - Or it didn't detect the account change
   
2. **`checkForExternalDeposits()` Failing Silently**
   - The method in `ExternalTransactionService.ts` line 74
   - Calls `getRecentTransactions()` from Helius (line 250)
   - If Helius returns error/empty, it returns `[]` without storing anything

3. **Helius API Rate Limiting**
   - We've seen 429 errors before
   - Transaction detection might be getting rate limited
   - No error logging when this happens

## Current Detection Flow

```
1. Solana WebSocket detects balance change
2. Calls `checkForExternalTransactions()` (line 139 in WebsocketBalanceSubscriber.ts)
3. Calls `externalTransactionService.checkForExternalDeposits(walletAddress)` (line 214)
4. Calls `getRecentTransactions()` from Helius (line 250 in ExternalTransactionService)
5. Filters for incoming transactions
6. Checks if already exists in database
7. Stores in `external_transactions` table if new
```

## Proposed Solutions

### Solution 1: Always Check on Balance Refresh

When balance is refreshed (manually or via WebSocket), also check for new transactions:

**Add to `portfolio-refresh.ts` after line 53:**
```typescript
// After updating cache, check for new external transactions
try {
  const externalTxs = await externalTransactionService.checkForExternalDeposits(wallet);
  if (externalTxs.length > 0) {
    const userId = await externalTransactionService.getUserIdByWallet(wallet);
    if (userId) {
      for (const tx of externalTxs) {
        await externalTransactionService.storeExternalTransaction(tx, userId);
      }
    }
  }
} catch (error) {
  logger.error('[REFRESH] Error checking external transactions', { error, wallet });
}
```

### Solution 2: Improve Error Logging

Add more detailed logging in `ExternalTransactionService.ts`:

```typescript
async getRecentTransactions(walletAddress: string): Promise<HeliusTransaction[]> {
  try {
    logger.info('[EXTERNAL_TX] Fetching transactions from Helius', { walletAddress });
    
    const response = await fetch(`${this.heliusBaseUrl}/v0/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}&limit=50`);
    
    if (!response.ok) {
      const errorText = await response.text();
      logger.error('[EXTERNAL_TX] Helius API error', { 
        status: response.status, 
        statusText: response.statusText,
        error: errorText,
        walletAddress 
      });
      throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
    }

    const transactions = await response.json();
    logger.info('[EXTERNAL_TX] Received transactions from Helius', { 
      walletAddress,
      count: transactions?.length || 0 
    });
    
    return transactions || [];
  } catch (error) {
    logger.error('[EXTERNAL_TX] Error fetching transactions from Helius', { error, walletAddress });
    return [];
  }
}
```

### Solution 3: Add Fallback Transaction Detection

Since `checkForExternalDeposits()` might fail, add a simpler approach:

```typescript
// In portfolio-refresh.ts, after getting portfolio
// Compare new balance with cached balance
// If balance increased, there's a new deposit

const oldBalance = cachedPortfolio?.totalSolValue || 0;
const newBalance = portfolio.totalSolValue;

if (newBalance > oldBalance && newBalance > 0) {
  // Something was deposited - log this for debugging
  logger.info('[REFRESH] Balance increased, should have detected transaction', {
    wallet,
    oldBalance,
    newBalance,
    increase: newBalance - oldBalance
  });
  
  // Manually trigger transaction check
  try {
    const externalTxs = await externalTransactionService.checkForExternalDeposits(wallet);
    logger.info('[REFRESH] Manually checked for transactions', {
      wallet,
      found: externalTxs.length
    });
  } catch (error) {
    logger.error('[REFRESH] Manual transaction check failed', { error, wallet });
  }
}
```

## Recommended Implementation

I suggest implementing all three solutions:

1. **Better logging** - See exactly where transaction detection fails
2. **Always check on refresh** - Don't rely solely on WebSocket
3. **Balance change detection** - Fallback when detection fails

This ensures transactions are always tracked, even if:
- WebSocket disconnects
- Helius API has issues
- Detection logic has bugs

Would you like me to implement these improvements?

