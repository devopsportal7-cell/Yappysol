# Chat System Architecture - Complete Logic

## Overview

The chat system uses a **multi-layered approach** to understand user intent, extract entities, manage context, and handle conversational flows.

## 1. Intent Classification

### AI-Based Classification (Primary)
Uses **GPT-4o-mini** to semantically understand user messages:

**Intents:**
- `swap` - Token trading/conversion
- `launch` - Token creation/minting
- `price` - Market price queries
- `portfolio` - User's assets/balance
- `trending` - Popular tokens
- `help` - Tutorial/guidance
- `general` - Chit-chat
- `stop` - Interrupt/cancel flows

**Key Logic:**
```typescript
// Lines 50-117 in IntentClassifier.ts
{
  intent: "swap|launch|price|portfolio|trending|help|general|stop",
  confidence: 0.00-1.00,
  entities: { fromToken?, toToken?, amount?, slippage? },
  isActionable: true|false,
  reason: "1 short user-facing sentence"
}
```

**Rules:**
- **Actionable** = user wants to DO something or GET personal data NOW
- "what is my portfolio" → `portfolio` (actionable: true)
- "how much is SOL" → `price` (actionable: true)
- "hello" → `general` (actionable: false)

### Keyword Fallback (Secondary)
If AI classification fails or confidence < 0.8, falls back to keyword matching:

```typescript
// Lines 119-460 in IntentClassifier.ts
swapKeywords = ['swap', 'trade', 'exchange', 'convert', 'buy', 'sell'];
launchKeywords = ['create token', 'launch token', 'mint token'];
priceKeywords = ['price', 'cost', 'worth', 'value'];
portfolioKeywords = ['portfolio', 'balance', 'assets', 'holdings'];
```

## 2. Entity Extraction

### AI-Based Extraction
Uses **GPT-4o-mini** to extract specific details from messages:

**For Swap Intent:**
```typescript
{
  fromToken: "SOL",
  toToken: "USDC",
  amount: "5",
  slippage: "1"
}
```

**For Launch Intent:**
```typescript
{
  tokenName: "MyToken",
  tokenSymbol: "MTK",
  description: "A cool token"
}
```

**For Price Intent:**
```typescript
{
  tokenSymbols: ["SOL", "BONK", "USDC"]
}
```

**Token Name Normalization:**
- "solana" or "sol" → "SOL"
- "usdc" → "USDC"
- "bonk" → "BONK"

### Keyword Fallback
Regex patterns and string matching for common token symbols.

## 3. Context Management

### Enhanced Context
Every message includes:

```typescript
const enhancedContext = {
  // User info
  userId: string,
  walletAddress: string,
  
  // Conversation flow
  currentStep: string | null,      // 'fromToken', 'toToken', 'amount', etc.
  flowType: string | null,         // 'swap', 'token-creation'
  entities: { ... },               // Extracted entities
  
  // Session state
  sessionId: string,
  chatHistory: Message[]
};
```

### Flow State Persistence
- Context stored in `chat_sessions` table
- Each step remembers previous answers
- FlowType recovered from session if missing

## 4. Multi-Step Conversational Flows

### Swap Flow (`flowType: 'swap'`)

**Steps:**
1. `fromToken` - What token to swap FROM
2. `toToken` - What token to swap TO
3. `amount` - How much to swap
4. `confirmation` - Confirm transaction

**Context Passing:**
```typescript
// TokenSwapService.ts lines 244-1066
let session = {
  fromToken: "SOL",        // From step 1
  toToken: "USDC",         // From step 2
  amount: "5",             // From step 3
  step: null,              // All steps complete
  flowType: "swap"
};
```

**Smart Routing:**
```typescript
// Lines 110-174 in chat.ts
if (currentStep) {
  if (flowType === 'swap') {
    → TokenSwapService.handleSwapIntent()
  } else if (flowType === 'token-creation') {
    → TokenCreationService.handleCreationIntent()
  }
}
```

### Launch Flow (`flowType: 'token-creation'`)

**Steps:**
1. `name` - Token name
2. `symbol` - Token ticker
3. `description` - Token description
4. `image` - Token image upload
5. `twitter/telegram/website` - Social links
6. `pool` - Initial liquidity pool
7. `confirmation` - Final confirmation

## 5. Intent Detection & Routing

### Main Flow (chat.ts lines 169-174)

```typescript
if (currentStep) {
  // CONTINUE EXISTING FLOW
  → Route to appropriate service based on flowType
} else {
  // NEW CONVERSATION
  → Do intent detection
}
```

### Intent Detection (ChatService.ts lines 513-1542)

```typescript
async chatWithOpenAI(message, context) {
  // 1. Classify intent
  const intentResult = await intentClassifier.classifyIntent(message);
  
  // 2. Extract entities
  const entities = await entityExtractor.extractEntities(message, intentResult.intent);
  
  // 3. Route to appropriate service
  switch (intentResult.intent) {
    case 'swap':
      → TokenSwapService.handleSwapIntent()
    case 'launch':
      → TokenCreationService.handleCreationIntent()
    case 'price':
      → TokenPriceService.handlePriceQuery()
    case 'portfolio':
      → UserPortfolioService.formatPortfolioForChat()
    case 'trending':
      → TrendingTokenService.getTrendingTokens()
    case 'help':
      → Show guided tutorial
    case 'general':
      → RAGService.answerQuestion() // Knowledge base or OpenAI
  }
}
```

## 6. Actionability Detection

### Distinguishing Actions vs Information

**Actionable:** User wants to DO something or GET personal data
- "swap 5 SOL for USDC" → DO swap
- "what's my portfolio" → GET personal data
- "create a token" → DO creation
- "how much is SOL" → GET market data

**Non-Actionable:** General questions or concepts
- "what is a token" → information
- "hello" → greeting
- "explain DeFi" → conceptual

**Implementation:**
```typescript
isActionable: result.isActionable !== undefined 
  ? result.isActionable 
  : this.determineActionability(message, result.intent)
```

## 7. Context Switching & Flow Interruption

### How It Works

**User interrupts flow:**
```typescript
// User is in swap flow (step: 'toToken')
// User asks: "what's my wallet balance"

// Lines 109-174 in chat.ts
if (isInterrupting(context, message)) {
  // Handle interruption
  → Route to portfolio service
  → Keep swap session alive for later
  
  // After answering interruption
  → Offer to resume: "Would you like to continue your swap?"
}
```

### Resume Flow
User says "yes" or "continue" → Resume from where left off

## 8. RAG (Retrieval-Augmented Generation)

For general questions when no intent is detected:

```typescript
// RAGService.ts lines 26-273
async answerQuestion(query, entities, context) {
  // 1. Create embedding for query
  const embedding = await embeddingService.createEmbedding(query);
  
  // 2. Search knowledge base
  const kbResults = await knowledgeBaseService.hybridSearch(query, embedding);
  
  // 3. If good results (similarity > 0.7)
  if (hasGoodKBResults) {
    → Use KB content + LLM to generate answer
  } else {
    → Fallback to OpenAI directly
  }
}
```

## 9. Follow-Up Questions

### Context Preservation

Entities stored in `enhancedContext` for follow-ups:

```typescript
// User: "what is the price of SOL"
// → entities: { tokenSymbols: ["SOL"] }
// → intent: "price"

// User: "how about BONK?"
// → Previous context: { tokenSymbols: ["SOL"] }
// → Update: { tokenSymbols: ["BONK"] }
// → Ask for price of BONK
```

### Smart Entity Merging
```typescript
// Lines 598-614 in ChatService.ts
const reExtractedEntities = await entityExtractor.extractEntities(message, 'swap');
Object.keys(reExtractedEntities).forEach(key => {
  if (reExtractedEntities[key] && !context[key]) {
    context[key] = reExtractedEntities[key]; // Add missing entities
  }
});
```

## 10. Services & Routing

### Service Responsibilities

1. **TokenSwapService** - Handles swap flows
2. **TokenCreationService** - Handles token creation flows  
3. **TokenPriceService** - Fetches market prices
4. **UserPortfolioService** - Gets user's portfolio
5. **TrendingTokenService** - Gets trending tokens
6. **RAGService** - Answers general questions
7. **EntityExtractor** - Extracts entities from messages
8. **IntentClassifier** - Classifies user intent

## 11. Frontend Communication

### Response Format
```json
{
  "prompt": "Swapping 5 SOL for USDC...",
  "action": "swap",
  "step": "amount",
  "flowType": "swap",
  "entities": {
    "fromToken": "SOL",
    "toToken": "USDC"
  },
  "timestamp": "2025-10-28T..."
}
```

### Frontend Handling
- `action` determines UI component to render
- `step` shows current progress
- `entities` populates forms
- Context preserved for follow-ups

## Summary

**The chat system:**
1. ✅ **Classifies intent** (AI + keyword fallback)
2. ✅ **Extracts entities** (token names, amounts, etc.)
3. ✅ **Manages context** (steps, flowType, entities)
4. ✅ **Routes to services** (swap, launch, price, portfolio)
5. ✅ **Handles multi-step flows** (guided conversations)
6. ✅ **Detects interruptions** (context switching)
7. ✅ **Preserves entities** (follow-up questions)
8. ✅ **Falls back to RAG** (general knowledge)
9. ✅ **Caches results** (performance optimization)
10. ✅ **Validates data** (ensures completeness)

The system is **semantic-first** (AI understanding) with **keyword fallback** for reliability, ensuring robust intent detection and entity extraction while maintaining conversational context.
