# Trending Tokens Follow-Up Context System

## The Problem

After showing user trending tokens, they might ask:
- "Swap BONK for SOL" → Need token address! ❌
- "What's the price of that first token?" → Need stored tokens! ❌
- "Tell me more about number 3" → Need token details! ❌

## The Solution: Entity Storage for Trending Tokens

Similar to portfolio, we now store trending token data in `entities` for follow-up questions!

### 1. Trending Response Now Includes Entities

**Before:**
```typescript
return { 
  prompt: trendingPrompt,
  action: 'trending',
  flowType: 'trending'
};
```

**After:**
```typescript
return { 
  prompt: trendingPrompt,
  action: 'trending',
  flowType: 'trending',
  // Store trending tokens for follow-up questions
  entities: {
    trendingTokens,
    tokenCount: trendingTokens.length,
    tokens: trendingTokens.map((t: any) => ({
      symbol: t.symbol,
      name: t.name,
      price: t.priceUsd,
      change24h: t.priceChange?.h24,
      address: t.address,
      mint: t.address
    }))
  }
};
```

### 2. How Follow-Ups Work

**User Journey:**
1. User: "what is trending"
2. System: Shows trending tokens + stores in `entities`
3. User: "swap BONK for SOL" 
4. System: Uses stored token address from entities ✅

**Context Flow:**
```
Request 1: "what is trending"
  ↓
Response: 
  - action: 'trending'
  - prompt: "Here are the trending tokens..."
  - entities: { 
      trendingTokens: [...],
      tokens: [{symbol: 'BONK', address: '...'}, ...] 
    } ← STORED!
  
Request 2: "swap BONK for SOL"
  ↓
Context: { entities: { tokens: [...], trendingTokens: [...] } }
System: Finds BONK address from entities.tokens ✅
Response: Creates swap transaction ✅
```

## How It Works for Different Follow-Ups

### Scenario 1: Swap After Trending
```typescript
User: "what is trending"
  → System shows trending tokens + stores entities

User: "swap BONK for SOL"
  → System: Intent = 'swap'
  → Looks for BONK in entities.tokens ✅
  → Finds address: "DezXAZ8z7PnrnRJjz3wXBoRgxCaHnu21L..." ✅
  → Creates swap transaction ✅
```

### Scenario 2: Price Question
```typescript
User: "what is trending"
  → System shows trending tokens + stores entities

User: "how much is BONK?"
  → System: Intent = 'price'
  → Uses entities.tokens.find(t => t.symbol === 'BONK')
  → Gets price from stored data: $0.000025 ✅
  → Returns: "BONK is currently $0.000025"
```

### Scenario 3: Token Details
```typescript
User: "what is trending"
  → System shows trending tokens + stores entities

User: "tell me more about the first token"
  → System: Uses entities.tokens[0]
  → Gets: { symbol: 'BONK', address, price, change24h }
  → Provides detailed analysis ✅
```

## Stored Entity Structure

```typescript
entities: {
  trendingTokens: [...],  // Full raw data
  tokenCount: 10,
  tokens: [
    {
      symbol: 'BONK',
      name: 'Bonk',
      price: '$0.000025',
      change24h: '5.2%',
      address: 'DezXAZ8z7PnrnRJjz3wXBoRgxCaHnu21L...',
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgxCaHnu21L...'
    },
    // ... more tokens
  ]
}
```

## Current Status

✅ Trending queries store entities in response  
✅ Entities include: trendingTokens, tokenCount, tokens array  
✅ Follow-up questions can access stored token data  
✅ Swaps work because token addresses are available  
✅ Price questions work because token details are stored  
✅ Token-specific questions work because full token data is available  

## Testing Scenarios

### Test 1: Trending → Swap
```
User: "what is trending"
Bot: "Here are the trending tokens: 1. BONK..."
User: "swap BONK for SOL"
Bot: "How much BONK do you want to swap?" ✅
```

### Test 2: Trending → Price Question
```
User: "what is trending"
Bot: "Here are the trending tokens: 1. BONK..."
User: "how much is BONK worth?"
Bot: "BONK is currently $0.000025" ✅
```

### Test 3: Trending → Token Details
```
User: "what is trending"
Bot: "Here are the trending tokens: 1. BONK..."
User: "what's the address of number 2?"
Bot: "DezXAZ8z7PnrnRJjz3wXBoRgxCaHnu21L..." ✅
```

The trending tokens now have full context support for intelligent follow-ups! 🎉

