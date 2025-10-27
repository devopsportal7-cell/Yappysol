# Frontend Portfolio Display - Complete Guide

## How Portfolio Data Flows to Frontend

### 1. **Backend API Response Structure**

The `/api/portfolio/:walletAddress` endpoint returns:

```json
{
  "totalSolValue": 0.062477480,
  "totalUsdValue": 12.120590000,
  "tokens": [
    {
      "mint": "So11111111111111111111111111111111111111112",
      "symbol": "SOL",
      "name": "Solana",
      "accountUnit": "62477480",
      "uiAmount": 0.06247748,
      "priceUsd": 194.04,
      "solEquivalent": 0.06247748,
      "usdEquivalent": 12.12,
      "image": "https://...",
      "solscanUrl": "https://solscan.io/token/...",
      "decimals": 9
    },
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC",
      "name": "USD Coin",
      "accountUnit": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "uiAmount": 3.962061,
      "priceUsd": 1.0,
      "solEquivalent": 0.02041,
      "usdEquivalent": 3.96,
      "image": "https://...",
      "solscanUrl": "https://solscan.io/token/...",
      "decimals": 6
    }
    // ... more tokens
  ]
}
```

### 2. **Frontend Fetching (Current Implementation)**

In `Chat.tsx`, the `useTotalPortfolioBalances` hook:

```typescript
const fetchPortfolio = useCallback(async () => {
  if (!publicKey) return;
  setLoading(true);
  try {
    const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
    const tokens = await res.json();  // ← Gets full portfolio object
    
    // Calculate totals
    for (const t of tokens) {
      if (t.symbol === 'SOL' && t.price) {
        solPriceUsd = Number(t.price);
        break;
      }
    }
    
    for (const t of tokens) {
      usd += Number(t.balanceUsd) || 0;
      if (t.symbol === 'SOL') {
        sol += Number(t.balance) || 0;
      } else if (t.price && solPriceUsd) {
        sol += (Number(t.balanceUsd) || 0) / solPriceUsd;
      }
    }
    
    setTotalUsd(usd);
    setTotalSol(sol);
  } catch (e) {
    setTotalUsd(0);
    setTotalSol(0);
  }
  setLoading(false);
}, [publicKey]);
```

**❌ ISSUE**: The current code expects `t.balanceUsd`, but the API returns:
- `t.usdEquivalent` (not `balanceUsd`)
- `t.uiAmount` (not `balance`)

### 3. **Fix: Update Frontend to Match API**

Replace the portfolio fetching logic in `Chat.tsx`:

```typescript
const fetchPortfolio = useCallback(async () => {
  if (!publicKey) return;
  setLoading(true);
  try {
    const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
    const portfolio = await res.json();  // ← Full portfolio object
    
    // Use the correct field names from API
    setTotalUsd(portfolio.totalUsdValue);
    setTotalSol(portfolio.totalSolValue);
    
    // Store tokens for display (optional, if needed elsewhere)
    setTokens(portfolio.tokens || []);
    
  } catch (e) {
    console.error('Failed to fetch portfolio:', e);
    setTotalUsd(0);
    setTotalSol(0);
    setTokens([]);
  }
  setLoading(false);
}, [publicKey]);
```

### 4. **Display Individual Tokens**

To show all tokens in a list:

```tsx
// In your component
const [tokens, setTokens] = useState([]);

// Fetch portfolio (from above)

// Display tokens
<div className="token-list">
  {tokens.map(token => (
    <div key={token.mint} className="token-item">
      <img src={token.image} alt={token.symbol} />
      <div>
        <h3>{token.symbol}</h3>
        <p>{token.name}</p>
      </div>
      <div>
        <div>{token.uiAmount.toFixed(6)} {token.symbol}</div>
        <div>${token.usdEquivalent.toFixed(2)}</div>
      </div>
    </div>
  ))}
</div>
```

### 5. **Token Field Mapping**

| Backend Field | Frontend Should Use | Example |
|--------------|---------------------|---------|
| `uiAmount` | Token balance | `3.962061` |
| `usdEquivalent` | USD value | `3.96` |
| `solEquivalent` | SOL value | `0.02041` |
| `priceUsd` | Price per token | `1.0` |
| `symbol` | Token ticker | `USDC` |
| `mint` | Token address | `EPjFWdd5...` |
| `image` | Logo URL | `https://...` |

### 6. **Complete Example Component**

```tsx
interface Token {
  mint: string;
  symbol: string;
  name?: string;
  uiAmount: number;
  usdEquivalent: number;
  solEquivalent: number;
  priceUsd: number;
  image?: string;
  solscanUrl: string;
}

interface Portfolio {
  totalSolValue: number;
  totalUsdValue: number;
  tokens: Token[];
}

function PortfolioDisplay() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const wallet = useWallet(); // Your wallet hook
  
  useEffect(() => {
    const fetchPortfolio = async () => {
      if (!wallet?.publicKey) return;
      
      const res = await fetch(`${apiUrl}/api/portfolio/${wallet.publicKey}`);
      const data = await res.json();
      setPortfolio(data);
    };
    
    fetchPortfolio();
  }, [wallet?.publicKey]);
  
  if (!portfolio) return <div>Loading...</div>;
  
  return (
    <div>
      {/* Total Balance */}
      <div className="total-balance">
        <h2>${portfolio.totalUsdValue.toFixed(2)}</h2>
        <p>{portfolio.totalSolValue.toFixed(6)} SOL</p>
      </div>
      
      {/* Token List */}
      <div className="tokens">
        {portfolio.tokens.map(token => (
          <div key={token.mint} className="token-row">
            <img src={token.image} alt={token.symbol} />
            <div>
              <div>{token.symbol}</div>
              <div>{token.name}</div>
            </div>
            <div>
              <div>{token.uiAmount.toFixed(6)} {token.symbol}</div>
              <div>${token.usdEquivalent.toFixed(2)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

## Summary

✅ **What's Working:**
- Backend correctly fetches all SPL tokens
- Backend returns proper field names: `usdEquivalent`, `uiAmount`, etc.
- Portfolio includes SOL + all SPL tokens
- Swap tracking is now logged to database

❌ **What's Broken:**
- Frontend expects `balanceUsd` but API returns `usdEquivalent`
- Frontend expects `balance` but API returns `uiAmount`
- This mismatch causes incorrect totals

✅ **Fix:**
Update `Chat.tsx` line 272-277 to use the correct field names.

