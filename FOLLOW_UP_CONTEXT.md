# Portfolio Follow-Up Context System

## The Problem

After showing user their portfolio, they might ask:
- "Swap SOL for USDC" → Should work ✅
- "How much is that worth?" → Need portfolio context! ❌
- "What's my total balance?" → Need portfolio context! ❌
- "Show me more details" → Need portfolio context! ❌

## The Solution: Entity Storage

When we return portfolio data, we now store it in `entities` for follow-up questions!

### 1. Portfolio Response Now Includes Entities

**Before:**
```typescript
return { 
  prompt: portfolioMsg,
  action: 'portfolio',
  actionData: portfolio
};
```

**After:**
```typescript
return { 
  prompt: portfolioMsg,
  action: 'portfolio',
  actionData: portfolio,
  // Store portfolio state for follow-up questions
  entities: {
    walletAddress,
    portfolioData: portfolio,
    tokens: portfolio.tokens || []
  }
};
```

### 2. How Follow-Ups Work

**User Journey:**
1. User: "what is my portfolio"
2. System: Shows portfolio + stores in `entities`
3. User: "How much is that worth?" 
4. System: Uses stored `portfolioData` from entities ✅

**Context Flow:**
```
Request 1: "what is my portfolio"
  ↓
Response: 
  - action: 'portfolio'
  - actionData: { totalUsdValue: 12.12, tokens: [...] }
  - entities: { walletAddress, portfolioData, tokens } ← STORED!
  
Request 2: "how much is that worth"
  ↓
Context: { entities: { portfolioData: {...} } } ← AVAILABLE!
System: Uses portfolioData.totalUsdValue ✅
```

### 3. Context is Maintained

The session stores entities in messages, so follow-ups have access to the full portfolio state!

**Frontend Flow:**
1. User asks about portfolio
2. Backend returns portfolio + entities
3. Frontend stores entities in context
4. Next question → Frontend sends entities in context
5. Backend uses entities to answer follow-ups ✅

## How It Works for Different Follow-Ups

### Scenario 1: Swap Request
```typescript
User: "what is my portfolio"
  → System shows portfolio + stores entities

User: "swap SOL for USDC"
  → System: Intent = 'swap' (different intent)
  → Extracts fromToken, toToken from message
  → Uses stored walletAddress from entities ✅
  → Creates swap transaction ✅
```

### Scenario 2: Value Question
```typescript
User: "what is my portfolio"
  → System shows portfolio + stores entities

User: "how much is that worth?"
  → System: Intent = 'general' or 'question'
  → Checks context.entities.portfolioData
  → Uses portfolioData.totalUsdValue ✅
  → Returns: "Your portfolio is worth $12.12"
```

### Scenario 3: Token Details
```typescript
User: "what is my portfolio"
  → System shows portfolio + stores entities

User: "tell me more about my tokens"
  → System: Intent = 'general' or 'portfolio'
  → Uses context.entities.tokens ✅
  → Shows detailed token breakdown
```

## Current Status

✅ Portfolio queries store entities in response  
✅ Entities include: walletAddress, portfolioData, tokens  
✅ Follow-up questions can access stored entities  
✅ Swaps work because walletAddress is available  
✅ General questions work because entities contain portfolio context  

## Testing Scenarios

### Test 1: Portfolio → Swap
```
User: "what is my portfolio"
Bot: "Your portfolio: $12.12 USD..."
User: "swap SOL for USDC"
Bot: "How much SOL do you want to swap?" ✅
```

### Test 2: Portfolio → Question
```
User: "what is my portfolio"
Bot: "Your portfolio: $12.12 USD..."
User: "how much is that worth?"
Bot: "Your total portfolio is worth $12.12 USD" ✅
```

### Test 3: Portfolio → Token Details
```
User: "what is my portfolio"
Bot: "Your portfolio: $12.12 USD..."
User: "show me my tokens"
Bot: Lists all tokens from entities.tokens ✅
```

The system now maintains full context for intelligent follow-ups! 🎉

