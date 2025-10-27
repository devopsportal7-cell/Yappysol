# Yappy's Portfolio Data Sent to Frontend

This document details **exactly** what data structure is sent to the frontend when a user queries their portfolio/assets.

---

## 📊 Data Flow

```
User: "what is my balance" or "show my portfolio"
    ↓
ChatService detects PORTFOLIO intent
    ↓
Fetches from BalanceCacheService (with 5-min cache)
    ↓
Returns structured data to frontend
```

---

## 🎯 Response Structure

When the user asks for their portfolio, the backend sends:

```typescript
{
  // Chat message displayed to user
  prompt: string,  // Formatted text like "Here are the assets in your wallet..."
  
  // Action identifier for frontend routing
  action: "portfolio",
  
  // Structured portfolio data for UI rendering
  actionData: {
    totalSolValue: number,      // Total SOL equivalent value
    totalUsdValue: number,       // Total USD value
    tokens: TokenBalance[]       // Array of all tokens held
  },
  
  // Context for follow-up questions
  entities: {
    walletAddress: string,
    portfolioData: { ... },
    tokens: TokenBalance[]       // Same as actionData.tokens
  }
}
```

---

## 📦 TokenBalance Structure

Each token in the `tokens` array contains:

```typescript
interface TokenBalance {
  // Token identity
  mint: string;                    // Token mint address (unique ID)
  symbol: string;                  // Token symbol (e.g., "SOL", "USDC", "BONK")
  name?: string;                   // Token full name (e.g., "Solana")
  
  // Balance information
  accountUnit: string;             // Raw account amount (as string)
  uiAmount: number;                // Human-readable amount (e.g., 1.5 SOL)
  decimals: number;                // Token decimals (e.g., 9 for SOL)
  
  // Price & Value
  priceUsd: number;                // Current price in USD
  solEquivalent: number;           // Value in SOL
  usdEquivalent: number;           // Value in USD
  
  // Metadata for display
  image?: string;                  // Token logo URL
  solscanUrl: string;             // Link to view on Solscan
  
  // Backend also computes:
  balance: number;                 // Same as uiAmount (for frontend compatibility)
  balanceUsd: number;             // Same as usdEquivalent (for frontend compatibility)
}
```

---

## 🎨 What User Sees

The `prompt` field contains a formatted markdown message like:

```markdown
Here are the assets in your wallet (7Ta9Z4r1VXFYgG9iDZLEajCk3zVHih3jTw5kKwNau1FQ):

**SOL** (Native Solana)
![SOL](https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png)
Balance: 1.2345 SOL
Price: $194.03 USD
Value: $239.56 USD

**USDC**
![USDC](https://...)
Balance: 1000.0000 USDC
Price: $1.00 USD
Value: $1000.00 USD
[View on Solscan](https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)

**BONK**
![BONK](https://...)
Balance: 5000.1234 BONK
Price: $0.0002 USD
Value: $1.00 USD
[View on Solscan](https://solscan.io/token/...)
```

---

## 🔍 Detailed Example Response

Here's a **complete** example of what gets sent:

```json
{
  "prompt": "Here are the assets in your wallet (7Ta9...):\n\n**SOL** (Native Solana)\n![SOL](...)\nBalance: 1.2345 SOL\nPrice: $194.03 USD\nValue: $239.56 USD\n\n**USDC**\n![USDC](...)\nBalance: 1000.0000 USDC\nPrice: $1.00 USD\nValue: $1000.00 USD\n[View on Solscan](...)\n\n",
  
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
        "decimals": 9,
        "priceUsd": 194.03,
        "solEquivalent": 1.2345,
        "usdEquivalent": 239.56,
        "image": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        "solscanUrl": "https://solscan.io/token/So11111111111111111111111111111111111111112",
        "balance": 1.2345,
        "balanceUsd": 239.56
      },
      {
        "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "symbol": "USDC",
        "name": "USD Coin",
        "accountUnit": "1000000000",
        "uiAmount": 1000.0,
        "decimals": 6,
        "priceUsd": 1.00,
        "solEquivalent": 5.15,
        "usdEquivalent": 1000.00,
        "image": "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
        "solscanUrl": "https://solscan.io/token/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
        "balance": 1000.0,
        "balanceUsd": 1000.00
      },
      {
        "mint": "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "symbol": "BONK",
        "name": "Bonk",
        "accountUnit": "50001234000",
        "uiAmount": 5000.1234,
        "decimals": 5,
        "priceUsd": 0.0002,
        "solEquivalent": 0.0257,
        "usdEquivalent": 1.00,
        "image": "https://arweave.net/h-...",
        "solscanUrl": "https://solscan.io/token/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263",
        "balance": 5000.1234,
        "balanceUsd": 1.00
      }
    ]
  },
  
  "entities": {
    "walletAddress": "7Ta9Z4r1VXFYgG9iDZLEajCk3zVHih3jTw5kKwNau1FQ",
    "portfolioData": {
      "totalSolValue": 5.1751,
      "totalUsdValue": 1239.56,
      "tokens": [ /* same as actionData.tokens */ ]
    },
    "tokens": [ /* same as actionData.tokens */ ]
  }
}
```

---

## ✅ What's Included for Each Token

| Field | Description | Example |
|-------|-------------|---------|
| **mint** | Token mint address (unique) | `So11111111111111111111111111111111111111112` |
| **symbol** | Token ticker | `SOL`, `USDC`, `BONK` |
| **name** | Full token name | `Solana`, `USD Coin`, `Bonk` |
| **balance** | User's token balance | `1.2345`, `1000.0`, `5000.1234` |
| **balanceUsd** | USD value of balance | `239.56`, `1000.00`, `1.00` |
| **priceUsd** | Current token price | `194.03`, `1.00`, `0.0002` |
| **image** | Token logo URL | `https://.../logo.png` |
| **solscanUrl** | Link to view on Solscan | `https://solscan.io/token/...` |

---

## 🎯 Key Points

1. **Native SOL is always included** - Even if the user has zero SOL, we show it as the first token
2. **Only tokens with price > 0** are included - Unless it's SOL (which is always shown)
3. **All balances are in UI amounts** - No need for frontend to calculate decimals
4. **Both SOL and USD values provided** - Frontend can display in either format
5. **Images are IPFS-resolved** - May take a moment to load but will work
6. **Solscan links are included** - For users to view on-chain

---

## 🔄 Caching Strategy

The data is cached in the database for **5 minutes**:
- First request: Fetches from Helius/Moralis APIs
- Subsequent requests: Returns cached data
- After 5 minutes: Fetches fresh data

This prevents:
- Excessive API calls
- Rate limiting
- Slow responses

---

## 💡 Frontend Usage

The frontend receives **two formats**:

1. **Text Format** (`prompt`) - Ready to display in chat
2. **Structured Data** (`actionData` + `entities`) - For rich UI cards

This allows the frontend to:
- Show a text response in the chat
- Render a portfolio card with token images, prices, etc.
- Store tokens for follow-up questions (e.g., "swap this for USDC")

---

## 🚨 Edge Cases

### Empty Portfolio
```json
{
  "prompt": "Your portfolio is currently empty or refreshing. Please check back in a moment.",
  "action": "portfolio",
  "actionData": { "isEmpty": true },
  "entities": { "walletAddress": "..." }
}
```

### Error Case
```json
{
  "prompt": "I encountered an error fetching your portfolio. Please try again.",
  "action": "portfolio"
}
```

### Zero Balance but Has Tokens
```json
{
  "prompt": "Here are the assets in your wallet:\n\n**SOL**\nBalance: 0.0000 SOL\nPrice: $194.03 USD\nValue: $0.00 USD\n",
  "action": "portfolio",
  "actionData": {
    "totalSolValue": 0,
    "totalUsdValue": 0,
    "tokens": [
      {
        "symbol": "SOL",
        "balance": 0,
        "balanceUsd": 0,
        "priceUsd": 194.03,
        ...
      }
    ]
  }
}
```

---

## 🎯 Summary

**Yes, we send a detailed list of tokens held by the address!**

The frontend receives:
- ✅ Full token list with balances
- ✅ Prices in USD and SOL
- ✅ Token images and metadata
- ✅ Solscan links
- ✅ Total portfolio value
- ✅ Formatted chat message

The frontend can use this data to:
1. Display a beautiful portfolio card
2. Show individual token holdings
3. Calculate portfolio percentages
4. Enable swapping specific tokens
5. Store context for follow-up questions

**Everything needed is in the `actionData.tokens` array!**

