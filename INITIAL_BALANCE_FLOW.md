# How Frontend Gets Initial Balance on Login

## The Problem You Identified
If there's no balance update when user logs in, how does the frontend show the balance?

## The Solution - Dual Approach

### REST API Response Includes Portfolio
When frontend calls `/api/auth/wallets` on login, backend now returns:

```json
{
  "wallets": [
    {
      "id": "...",
      "publicKey": "YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG",
      "isImported": false,
      "balance": 0.06247748,  // SOL balance
      "portfolio": {            // ← NEW! Full portfolio data
        "totalSolValue": 0.062477480,
        "totalUsdValue": 12.120590000,
        "tokens": []
      }
    }
  ]
}
```

### WebSocket Update Also Sent
Backend also emits WebSocket `portfolio_update` message for real-time updates.

## How Frontend Should Use This

### On Login:
```typescript
// Call /api/auth/wallets
const response = await fetch('/api/auth/wallets', {
  headers: { Authorization: `Bearer ${token}` }
});

const { wallets } = await response.json();

// Wallet now has portfolio data!
const wallet = wallets[0];
console.log(wallet.portfolio.totalUsdValue); // $12.12
console.log(wallet.portfolio.totalSolValue); // 0.06247748
```

### Display Balance:
```typescript
// Show USD equivalent
<div>${wallet.portfolio.totalUsdValue.toFixed(2)}</div>

// Show SOL equivalent  
<div>{wallet.portfolio.totalSolValue.toFixed(6)} SOL</div>
```

## Fallback Strategy

### If Portfolio Not Cached Yet:
```json
{
  "wallets": [
    {
      "id": "...",
      "publicKey": "...",
      "balance": 0.06247748,  // Only SOL balance
      // portfolio field missing
    }
  ]
}
```

Frontend should:
1. Use basic `balance` field for SOL display
2. Wait for WebSocket `portfolio_update` message to get USD value
3. Or call `/api/portfolio/:walletAddress` to fetch portfolio

## Summary

✅ **Immediate Display:** REST API includes portfolio data on login  
✅ **Real-time Updates:** WebSocket sends updates when balance changes  
✅ **Fallback:** If no portfolio cached, use basic SOL balance  

This ensures the frontend **always** has balance data immediately on login!
