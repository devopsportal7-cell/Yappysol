# Activity Feed - Transactions (Deposits & Withdrawals)

## Current Implementation

The activity feed **WILL track both deposits AND withdrawals** when transactions are properly stored in the database.

### What's Included

✅ **Token Launches** - When user creates tokens
✅ **Swaps** - When user swaps tokens  
✅ **Deposits** - External funds received to user's wallet
✅ **Withdrawals** - Funds sent from user's wallet to external addresses

## How It Works

### 1. Deposits (Incoming Transactions)
When someone sends funds to the user's wallet:

```json
{
  "type": "external",
  "title": "Received 5 SOL",
  "description": "External deposit",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature",
    "tokenSymbol": "SOL",
    "amount": 5,
    "valueUsd": 970,
    "recipient": "user_wallet_address"
  }
}
```

### 2. Withdrawals (Outgoing Transactions)
When user sends funds to external addresses:

```json
{
  "type": "external", 
  "title": "Sent 2 SOL",
  "description": "Sent to external address",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature",
    "tokenSymbol": "SOL",
    "amount": 2,
    "valueUsd": 388,
    "sender": "user_wallet_address"
  }
}
```

## Database Query

The activity endpoint queries:

```sql
-- Deposits (incoming)
SELECT * FROM external_transactions
WHERE recipient IN (user_wallet_addresses)
ORDER BY block_time DESC;

-- Withdrawals (outgoing)  
SELECT * FROM external_transactions
WHERE sender IN (user_wallet_addresses)
ORDER BY block_time DESC;
```

## Important Note

⚠️ **The `ExternalTransactionService` currently only tracks INCOMING transactions (deposits)** by default.

To track WITHDRAWALS (outgoing), you need to:

1. **Modify ExternalTransactionService** to also detect and store outgoing transactions
2. **Or** ensure that your transaction tracking system stores both incoming AND outgoing transactions in the `external_transactions` table

## Updating ExternalTransactionService

To track withdrawals, add this method to `ExternalTransactionService`:

```typescript
/**
 * Check for new external withdrawals for a specific wallet
 */
async checkForExternalWithdrawals(walletAddress: string): Promise<ExternalTransaction[]> {
  try {
    if (this.platformWallets.length === 0) {
      await this.loadPlatformWallets();
    }

    // Get recent transactions from Helius
    const transactions = await this.getRecentTransactions(walletAddress);
    
    // Filter for outgoing transactions where wallet is sender
    const outgoingTxs = transactions.filter(tx => 
      this.isOutgoingTransaction(tx, walletAddress) &&
      tx.confirmationStatus === 'finalized' &&
      !tx.err
    );

    // Filter for external transactions (not to platform wallets)
    const externalTxs = outgoingTxs.filter(tx => this.isExternalTransaction(tx));

    const externalTransactions: ExternalTransaction[] = [];
    for (const tx of externalTxs) {
      const exists = await this.checkTransactionExists(tx.signature);
      if (!exists) {
        const externalTx = await this.convertToExternalTransaction(tx, walletAddress, true); // true = isWithdrawal
        if (externalTx) {
          externalTransactions.push(externalTx);
        }
      }
    }

    return externalTransactions;
  } catch (error) {
    logger.error('[EXTERNAL_TX] Error checking external withdrawals', { error, walletAddress });
    return [];
  }
}

/**
 * Check if transaction is outgoing from the wallet
 */
private isOutgoingTransaction(tx: HeliusTransaction, walletAddress: string): boolean {
  // Check if wallet sent tokens (decrease in token balance)
  const hasTokenDecrease = tx.preTokenBalances?.some(balance => 
    balance.owner === walletAddress && balance.uiTokenAmount?.uiAmount > 0
  ) && tx.postTokenBalances?.every(balance => 
    balance.owner !== walletAddress || balance.uiTokenAmount?.uiAmount === 0
  );

  // Check if wallet sent SOL (postBalance < preBalance)
  const walletIndex = tx.accounts.indexOf(walletAddress);
  if (walletIndex !== -1) {
    const preBalance = tx.preBalances[walletIndex] || 0;
    const postBalance = tx.postBalances[walletIndex] || 0;
    const solDecrease = postBalance < preBalance;

    return hasTokenDecrease || solDecrease;
  }

  return hasTokenDecrease || false;
}
```

And modify `convertToExternalTransaction` to accept an `isWithdrawal` parameter:

```typescript
private async convertToExternalTransaction(
  tx: HeliusTransaction, 
  walletAddress: string,
  isWithdrawal: boolean = false
): Promise<ExternalTransaction | null> {
  // ... existing logic ...
  
  return {
    signature: tx.signature,
    blockTime: tx.blockTime,
    amount: amount,
    tokenMint: tokenMint,
    tokenSymbol: tokenSymbol,
    tokenName: tokenName,
    sender: tx.accounts[0], // First account is typically the sender
    recipient: tx.accounts[1], // Second account is typically the recipient
    type: tokenMint === 'So11111111111111111111111111111111111111112' ? 'SOL' : 'SPL',
    valueUsd: valueUsd,
    solscanUrl: `https://solscan.io/tx/${tx.signature}`,
    isWithdrawal: isWithdrawal // NEW FIELD
  };
}
```

## Summary

**Yes, the activity feed WILL show withdrawals** once:
1. The `external_transactions` table has outgoing transactions stored with `sender` field populated
2. The activity endpoint properly differentiates between deposits and withdrawals

The current implementation is **ready to display both** - it just needs the database to have withdrawal data tracked.

