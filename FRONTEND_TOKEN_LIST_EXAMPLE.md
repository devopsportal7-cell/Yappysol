# Exact Token List/Assets Data Sent to Frontend

## 📦 Complete Response Structure

Here's the **exact JSON** sent to the frontend when a user asks for their portfolio:

```json
{
  "message": "Here are the assets in your wallet (...)...",
  "action": "portfolio",
  "actionData": {
    "totalSolValue": 5.1751,
    "totalUsdValue": 1239.56,
    "tokens": [
      {
        "mint": "So11111111111111111111111111111111111111112",
        "symbol": "SOL",
        "name": "Solana",
        "accountUnit": "1234500000",
        "uiAmount": 1.2345,
        "priceUsd": 194.03,
        "solEquivalent": 1.2345,
        "usdEquivalent": 239.56,
        "image": "https://...",
        "solscanUrl": "https://solscan.io/token/...",
        "decimals": 9
      },
      // ... more tokens
    ]
  },
  "entities": { /* same structure as actionData */ }
}
```

---

## 🔑 Key Fields in Each Token Object

### Core Identity
```typescript
mint: string           // Unique token mint address
symbol: string         // Token ticker (SOL, USDC, BONK)
name?: string          // Full token name
decimals: number       // Token decimals (9 for SOL, 6 for USDC)
```

### Balance Information
```typescript
uiAmount: number        // Human-readable balance (1.2345 SOL)
accountUnit: string     // Raw amount as string ("1234500000")
```

### Pricing Data
```typescript
priceUsd: number        // Current USD price ($194.03)
solEquivalent: number   // Value in SOL (1.2345 SOL)
usdEquivalent: number   // Value in USD ($239.56)
```

### Display Elements
```typescript
image: string           // Token logo URL
solscanUrl: string      // Link to view on Solscan
```

---

## 📊 Example with Real Data

### Token 1: Native SOL
```json
{
  "mint": "So11111111111111111111111111111111111111112",
  "symbol": "SOL",
  "name": "Solana",
  "accountUnit": "1234500000",
  "uiAmount": 1.2345,
  "priceUsd": 194.03,
  "solEquivalent": 1.2345,
  "usdEquivalent": 239.56,
  "image": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
  "solscanUrl": "https://solscan.io/token/So11111111111111111111111111111111111111112",
  "decimals": 9
}
```

### Token 2: USDC
```json
{
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "symbol": "USDC",
  "name": "USD Coin",
  "accountUnit": "1000000000",
  "uiAmount": 1000.0,
  "priceUsd": 1.00,
  "solEquivalent": 5.1551,
  "usdEquivalent": 1000.00,
  "image": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
  "solscanUrl": "https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "decimals": 6
}
```

### Token 3: BONK
```json
{
  "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "symbol": "BONK",
  "name": "Bonk",
  "accountUnit": "50001234000",
  "uiAmount": 5000.1234,
  "priceUsd": 0.0002,
  "solEquivalent": 0.0257,
  "usdEquivalent": 1.00,
  "image": "https://arweave.net/hBt0gOzAXC5W1HOqxLEC0hP9qSHO3BEO1zSkG2_f1sk",
  "solscanUrl": "https://solscan.io/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
  "decimals": 5
}
```

---

## 🎯 How Frontend Can Use This Data

### 1. Display Token List
```typescript
const tokens = response.actionData.tokens;
tokens.forEach(token => {
  // Render: symbol, balance, price, logo
  console.log(`${token.symbol}: ${token.uiAmount} ($${token.usdEquivalent})`);
});
```

### 2. Calculate Portfolio Totals
```typescript
const totalUsd = response.actionData.totalUsdValue; // 1239.56
const totalSol = response.actionData.totalSolValue; // 5.1751
```

### 3. Show Individual Token Cards
```tsx
{tokens.map(token => (
  <TokenCard
    symbol={token.symbol}
    balance={token.uiAmount}
    price={token.priceUsd}
    usdValue={token.usdEquivalent}
    image={token.image}
    solscanUrl={token.solscanUrl}
  />
))}
```

### 4. Enable Swapping
```typescript
// User can click a token to swap it
const selectedToken = tokens.find(t => t.symbol === 'BONK');
// Then trigger swap flow with fromToken: 'BONK'
```

### 5. Display Percentages
```typescript
tokens.forEach(token => {
  const percentage = (token.usdEquivalent / totalUsd) * 100;
  console.log(`${token.symbol}: ${percentage.toFixed(2)}% of portfolio`);
});
```

---

## 📋 Complete TypeScript Interface

```typescript
interface TokenBalance {
  mint: string;              // Token mint address
  symbol: string;            // Token ticker
  name?: string;             // Full token name
  accountUnit: string;       // Raw amount as string
  uiAmount: number;          // Human-readable balance
  priceUsd: number;          // Current USD price
  solEquivalent: number;    // Value in SOL
  usdEquivalent: number;     // Value in USD
  image?: string;            // Token logo URL
  solscanUrl: string;        // Solscan link
  decimals: number;          // Token decimals
}

interface WalletPortfolio {
  totalSolValue: number;     // Total portfolio value in SOL
  totalUsdValue: number;     // Total portfolio value in USD
  tokens: TokenBalance[];    // Array of token holdings
}

interface ChatResponse {
  message: string;           // Formatted text message
  action: 'portfolio';       // Action identifier
  actionData: WalletPortfolio; // Structured portfolio data
  entities: {                 // Context for follow-up
    walletAddress: string;
    portfolioData: WalletPortfolio;
    tokens: TokenBalance[];
  };
}
```

---

## ✅ Summary

### What Gets Sent:
1. **Text Message** - Formatted markdown for display
2. **Action Identifier** - "portfolio" for routing
3. **Structured Data** - Complete token list with all details
4. **Totals** - Overall portfolio value in SOL and USD
5. **Context** - Duplicate data for follow-up questions

### For Each Token:
- ✅ Symbol & Name
- ✅ Balance (human-readable)
- ✅ Current Price (USD)
- ✅ USD Value
- ✅ SOL Equivalent
- ✅ Token Image
- ✅ Solscan Link
- ✅ Decimals (for formatting)

### Frontend Can:
- ✅ Display token list
- ✅ Show totals
- ✅ Enable swapping
- ✅ Calculate percentages
- ✅ Display images
- ✅ Link to Solscan
- ✅ Support follow-up questions

---

## 📄 See Also

Full example JSON: `EXACT_FRONTEND_DATA_EXAMPLE.json`

