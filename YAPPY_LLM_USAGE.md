# Yappy's LLM Usage - Complete Overview

## 🎯 Summary

**Yes, we use OpenAI LLMs extensively!** Specifically:
- **GPT-4o-mini** (primary) - Fast, cost-effective
- **GPT-4** (for complex analysis) - More powerful reasoning
- **GPT-3.5-turbo** (legacy/fallback) - Older generation

---

## 🔧 LLM Integration Points

### 1. Intent Classification (`IntentClassifier.ts`)

**Model:** `gpt-4o-mini`

**Purpose:** Understand what the user wants to do

**Example:**
```typescript
const completion = await openai!.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.1,  // Low temp for consistent classification
  messages: [{
    role: 'system',
    content: 'You are an intent classifier for Yappysol...'
  }, {
    role: 'user',
    content: message
  }]
});
```

**Handles:**
- "swap SOL for USDC" → `swap` intent
- "what is my balance" → `portfolio` intent
- "how much is SOL" → `price` intent
- "show trending tokens" → `trending` intent

---

### 2. Entity Extraction (`EntityExtractor.ts`)

**Model:** `gpt-4o-mini`

**Purpose:** Extract structured data from user messages

**Example:**
```typescript
const completion = await openai!.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.2,  // Low temp for accurate extraction
  messages: [{
    role: 'system',
    content: 'Extract token entities from: [swap SOL for USDC]'
  }]
});
```

**Extracts:**
- Swap: `{fromToken: "SOL", toToken: "USDC", amount: "1"}`
- Launch: `{tokenName: "MyCoin", tokenSymbol: "MC"}`
- Price: `{tokenSymbols: ["SOL", "BONK"]}` (multi-token support)

---

### 3. Conversational Responses

#### A. Trending Tokens Response (`ChatService.ts`)

**Model:** `gpt-4o-mini`

**Purpose:** Generate engaging responses for trending tokens

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.7,  // Medium temp for natural responses
  messages: [
    { role: 'system', content: 'You are Yappysol...' },
    { role: 'user', content: message }
  ]
});
```

**Produces:**
```markdown
🚀 Check out these trending tokens on Solana!

**Top Gainers:**
- BONK (+15.2%) - The meme coin is pumping!
- WIF (+8.5%) - Dogwif hat continues to trend

📊 **Detailed Data:**
[Structured token data for frontend]
```

---

#### B. Price Query Response (`ChatService.ts`)

**Model:** `gpt-4o-mini`

**Purpose:** Generate natural price comparison responses

```typescript
const chatResponse = await openai!.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.7,
  messages: [
    { 
      role: 'system', 
      content: 'You are a helpful assistant providing token price information. 
                 Generate a natural, conversational response. 
                 If comparing prices, calculate and explain the difference.' 
    },
    { role: 'user', content: message }
  ]
});
```

**Produces:**
```
The current prices are:
- SOL: $194.03 USD
- BONK: $0.0002 USD

That's a big difference! SOL is worth about 970,000 times more than BONK.
```

---

#### C. General Trading & Analysis (`ChatService.ts`)

**Model:** `gpt-4` (most powerful)

**Purpose:** Expert trading advice and market analysis

```typescript
const completion = await openai.chat.completions.create({
  model: 'gpt-4',  // Using GPT-4 for better analysis
  temperature: 0.7,
  messages: [
    { 
      role: 'system', 
      content: 'You are Soltikka, an expert Solana DeFi trading assistant...'
    },
    { role: 'user', content: enhancedMessage }
  ]
});
```

**Handles:**
- "Should I buy BONK?" → Provides trading advice
- "What's the best strategy for yield farming?" → Strategy guidance
- "Analyze my portfolio" → Portfolio analysis
- "What is DeFi?" → Educational content

---

### 4. RAG Service (`RAGService.ts`)

**Model:** `gpt-4o-mini` + Embeddings

**Purpose:** Answer questions using knowledge base

**How it works:**
1. User asks: "How does Jupiter DEX work?"
2. System searches knowledge base using embeddings
3. Retrieves relevant documents
4. Sends to GPT-4o-mini with context
5. Returns informed answer

```typescript
const completion = await this.openai!.chat.completions.create({
  model: 'gpt-4o-mini',
  temperature: 0.3,  // Low temp for factual answers
  messages: [
    { role: 'system', content: 'You are Yappysol...' },
    { role: 'user', content: `Question: ${query}\n\nContext:\n${context}` }
  ]
});
```

---

### 5. Embeddings (`EmbeddingService.ts`)

**Model:** `text-embedding-ada-002`

**Purpose:** Generate embeddings for semantic search

**Used for:**
- Indexing documents in knowledge base
- Semantic search for relevant content
- Similarity matching

```typescript
const embeddingResponse = await this.openai!.embeddings.create({
  model: 'text-embedding-ada-002',
  input: text
});
```

---

## 📊 Model Usage Summary

| Service | Model | Purpose | Temperature | Used For |
|---------|-------|---------|-------------|----------|
| **Intent Classification** | GPT-4o-mini | Understanding user intent | 0.1 | Low, consistent |
| **Entity Extraction** | GPT-4o-mini | Extracting data | 0.2 | Accurate parsing |
| **Trending Response** | GPT-4o-mini | Engaging responses | 0.7 | Conversational |
| **Price Response** | GPT-4o-mini | Price comparisons | 0.7 | Natural language |
| **Trading Analysis** | **GPT-4** | Expert advice | 0.7 | Complex reasoning |
| **RAG Answers** | GPT-4o-mini | Knowledge base | 0.3 | Factual |
| **Embeddings** | text-embedding-ada-002 | Semantic search | N/A | Vector search |

---

## 🎯 Which Model Where?

### GPT-4o-mini (Primary) - 90% of requests
- Intent classification
- Entity extraction
- Conversational responses
- Trending tokens
- Price queries
- RAG answers

**Why GPT-4o-mini?**
- ✅ Fast (lower latency)
- ✅ Cost-effective (~10x cheaper than GPT-4)
- ✅ Good enough for most tasks
- ✅ Lower rate limits

### GPT-4 (Expert Analysis) - 10% of requests
- Complex trading advice
- Portfolio analysis
- Market intelligence
- Strategy recommendations

**Why GPT-4?**
- ✅ Better reasoning
- ✅ More nuanced analysis
- ✅ Handles complex queries
- ❌ Slower & more expensive

### GPT-3.5-turbo (Legacy)
- Fallback if custom system prompt provided
- Older implementation
- Not actively used

---

## 💰 Cost Considerations

### API Call Frequency (per user message)

**Light Usage:**
- 1x Intent Classification (GPT-4o-mini) = ~$0.001
- 1x Entity Extraction (GPT-4o-mini) = ~$0.001
- 1x Response Generation (GPT-4o-mini) = ~$0.002
- **Total: ~$0.004 per message**

**Heavy Usage (with RAG):**
- 1x Intent Classification = ~$0.001
- 1x Entity Extraction = ~$0.001
- 1x Knowledge Base Search = ~$0.003
- 1x RAG Answer (GPT-4o-mini) = ~$0.002
- **Total: ~$0.007 per message**

**Expert Analysis:**
- 1x Intent Classification = ~$0.001
- 1x GPT-4 Analysis = ~$0.030
- **Total: ~$0.031 per message**

---

## 🔑 Environment Variable

All LLM functionality requires:
```bash
OPENAI_API_KEY=sk-...
```

If not provided:
- Intent classification falls back to keyword matching
- Entity extraction falls back to regex patterns
- Conversational responses become static text
- Trading analysis becomes unavailable

---

## 🎯 Alternative Options

**Currently NOT used but configured:**
- ❌ DeepSeek API (exists in code but not active)
- ❌ Local models (Ollama, etc.)
- ❌ Anthropic Claude

**Future possibilities:**
- Add DeepSeek as fallback to OpenAI
- Implement local model support
- Use Claude for certain tasks

---

## 📈 Performance Metrics

**Latency (typical):**
- GPT-4o-mini: ~500ms-1s per request
- GPT-4: ~2-4s per request
- Total chat response: ~1-3s end-to-end

**Throughput:**
- Can handle multiple concurrent users
- Rate limits: Managed per-user
- Caching: Intent/entity results cached

---

## 🎯 Summary

**We use OpenAI models extensively:**

1. **GPT-4o-mini** - Primary model for 90% of tasks
2. **GPT-4** - Expert analysis and complex reasoning
3. **text-embedding-ada-002** - Semantic search

**Without these LLMs:**
- ❌ No semantic understanding
- ❌ Only rigid keyword matching
- ❌ No natural conversational responses
- ❌ No intelligent entity extraction

**The LLMs enable:**
- ✅ Natural language understanding
- ✅ Intelligent intent classification
- ✅ Conversational responses
- ✅ Multi-token price queries
- ✅ Context-aware analysis

**Yappy is powered by AI! 🚀**

