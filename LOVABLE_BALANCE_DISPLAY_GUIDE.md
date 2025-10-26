# Frontend Balance Display Guide for Lovable Team

## What the WebSocket Sends

When a wallet balance updates, the frontend receives a WebSocket message with this structure:

```json
{
  "type": "portfolio_update",
  "walletAddress": "YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG",
  "timestamp": "2025-10-26T21:30:00.000Z",
  "data": {
    "totalSolValue": 0.062477480,    // ✅ Actual SOL balance (always shows)
    "totalUsdValue": 12.120590000,   // ✅ USD equivalent (was 0 before, now fixed)
    "tokens": [
      {
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "symbol": "USDC",
        "name": "USD Coin",
        "uiAmount": 1000.50,
        "solEquivalent": 5.123456,
        "usdEquivalent": 1000.50,
        "priceUsd": 1.0,
        "image": "https://...",
        "solscanUrl": "https://solscan.io/token/...",
        "decimals": 6
      }
    ]
  }
}
```

## What to Display

### Primary Display (User's Wallet Balance)

Show **TOTAL USD VALUE** as the main balance:

```typescript
// In your component
<div className="wallet-balance">
  <span className="balance-amount">
    ${data.totalUsdValue.toFixed(2)}
  </span>
  <span className="balance-label">Total Balance</span>
</div>
```

**Example:**
```
$12.12
Total Balance
```

### Secondary Display (SOL Breakdown)

Show SOL equivalent in smaller text below:

```typescript
<div className="sol-equivalent">
  {data.totalSolValue.toFixed(6)} SOL
</div>
```

**Example:**
```
0.062477 SOL
```

### Complete Example

```tsx
interface PortfolioData {
  totalSolValue: number;    // Actual SOL
  totalUsdValue: number;    // USD equivalent
  tokens: TokenBalance[];
}

const BalanceDisplay = ({ portfolio }: { portfolio: PortfolioData }) => {
  return (
    <div className="balance-display">
      {/* Main USD Balance */}
      <div className="main-balance">
        <span className="currency">$</span>
        <span className="amount">{portfolio.totalUsdValue.toFixed(2)}</span>
        <span className="label">USD</span>
      </div>
      
      {/* SOL Breakdown */}
      <div className="sol-equivalent">
        {portfolio.totalSolValue.toFixed(6)} SOL
      </div>
      
      {/* Token List (if any) */}
      {portfolio.tokens.length > 0 && (
        <div className="token-list">
          <h4>Tokens</h4>
          {portfolio.tokens.map(token => (
            <div key={token.mint}>
              <span>{token.symbol}</span>
              <span>{token.uiAmount.toFixed(6)}</span>
              <span>${token.usdEquivalent.toFixed(2)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
```

## Expected Values After Fix

Before the fix (what you were seeing):
- `totalSolValue`: 0.062477480 ✅
- `totalUsdValue`: 0.000000000 ❌ (was showing 0)

After the fix (what you should see now):
- `totalSolValue`: 0.062477480 ✅
- `totalUsdValue`: ~12.12 ✅ (approximately $194/讲 × 0.062477480)

## What Changed

1. **Backend Fix:** USD conversion now includes native SOL balance (was only calculating for SPL tokens)
2. **WebSocket Format:** Unchanged - still sends the same structure
3. **Frontend Display:** Should now show correct USD equivalent (~$12.12 instead of $0.00)

## Testing

After deploying the fix:

1. **Open Frontend Console** and look for WebSocket messages:
   ```
   [WebSocket] Received: {"type":"portfolio_update","walletAddress":"...","data":{"totalSolValue":0.062477480,"totalUsdValue":12.12}}
   ```

2. **Verify Display:**
   - Should show: `$12.12` (not `$0.00`)
   - SOL equivalent: `0.062477 SOL`

3. **Test Real-Time Update:**
   - Send SOL to the wallet
   - Within seconds, both SOL and USD should update automatically

## CSS Styles (Recommended)

```css
.balance-display {
  padding: 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  color: white;
}

.main-balance {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.currency {
  font-size: 32px;
  font-weight: 300;
}

.amount {
  font-size: 56px;
  font-weight: 700;
}

.label {
  font-size: 24px;
  opacity: 0.9;
}

.sol-equivalent {
  margin-top: 12px;
  font-size: 18px;
  opacity: 0.8;
}
```

## Summary

- **Display:** `totalUsdValue` as primary balance (USD equivalent)
- **Secondary:** Show `totalSolValue` in smaller text (actual SOL)
- **Both values** are sent in the WebSocket message
- The USD value was showing $0 before, now shows correct amount (~$12.12)
