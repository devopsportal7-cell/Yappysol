# SPL Token Balance Check Fix

## Problem

When swapping FROM a token (e.g., USDC → SOL), the system was checking SOL balance instead of the token balance.

### Example Error:
```
User wants to swap: 4 USDC → SOL
Error: "Need 4.000505 SOL, have 0.017721 SOL"
```

The system was checking SOL balance when it should check USDC balance!

## Root Cause

In `TokenSwapService.ts`, the balance validation was always checking SOL:

```typescript
// ❌ WRONG - Always checks SOL
const balanceCheck = await WalletService.hasSufficientBalance(
  walletInfo.id, 
  amount, 
  fees
);
```

This only works for swaps **FROM SOL** (buying tokens with SOL).

For swaps **FROM tokens** (selling tokens for SOL), we need to check the SPL token balance, not SOL!

## Solution

### 1. Conditional Balance Check

Added logic to check the correct balance based on swap direction:

```typescript
if (action === 'buy') {
  // Buying with SOL → check SOL balance
  const fees = WalletService.calculateTransactionFees('token-swap', amount);
  const balanceCheck = await WalletService.hasSufficientBalance(
    walletInfo.id, 
    amount, 
    fees
  );
  // ... SOL balance check
} else if (action === 'sell') {
  // Selling token → check token balance
  const { balanceCacheService } = await import('./BalanceCacheService');
  const tokenBalances = await balanceCacheService.getTokenBalancesFromCache(walletInfo.publicKey);
  const tokenBalance = tokenBalances.find(t => t.mint === mint);
  
  if (!tokenBalance || tokenBalance.uiAmount < amount) {
    const tokenSymbol = POPULAR_TOKENS.find(t => t.mint === mint)?.symbol || mint.slice(0, 8);
    return {
      prompt: `Insufficient ${tokenSymbol} balance. Need ${amount} ${tokenSymbol}, have ${tokenBalance?.uiAmount?.toFixed(6) || 0} ${tokenSymbol}.`
    };
  }
}
```

### 2. Made `getTokenBalancesFromCache` Public

Changed from `private` to `public` so other services can access token balances:

```typescript
// BalanceCacheService.ts
async getTokenBalancesFromCache(walletAddress: string): Promise<TokenBalance[]>
```

## How It Works Now

### Swap FROM SOL (Buy):
- Checks SOL balance
- Error: "Need X SOL, have Y SOL"

### Swap TO SOL (Sell):
- Checks SPL token balance (USDC, USDT, etc.)
- Error: "Insufficient USDC balance. Need 4 USDC, have 3.96 USDC"

## Example

**Before Fix:**
```
User: "swap 4usdc to sol"
Error: "Need 4.000505 SOL, have 0.017721 SOL" ❌
```

**After Fix:**
```
User: "swap 4usdc to sol"
Checks: USDC balance in cache
Error: "Insufficient USDC balance. Need 4 USDC, have 3.96 USDC" ✅
```

## Summary

✅ **Buying tokens (SOL → Token)**: Checks SOL balance
✅ **Selling tokens (Token → SOL)**: Checks token balance
✅ **Proper error messages**: Shows which token is insufficient

