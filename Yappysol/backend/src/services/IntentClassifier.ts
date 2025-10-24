import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface IntentResult {
  intent: 'swap' | 'launch' | 'price' | 'portfolio' | 'trending' | 'general';
  confidence: number;
  entities: Record<string, any>;
  reasoning?: string;
  isActionable: boolean; // NEW: distinguishes actionable vs question intents
}

export class IntentClassifier {
  private cache: Map<string, IntentResult> = new Map();
  private readonly CACHE_SIZE = 100;
  private readonly MIN_CONFIDENCE = 0.7;

  /**
   * Classify user intent using AI with fallback to keyword matching
   */
  async classifyIntent(message: string): Promise<IntentResult> {
    const cacheKey = message.toLowerCase().trim();
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      console.log('[IntentClassifier] Cache hit:', cacheKey);
      return this.cache.get(cacheKey)!;
    }

    // Try AI classification if available
    if (openai) {
      try {
        const aiResult = await this.classifyWithAI(message);
        
        // Cache successful results
        if (aiResult.confidence >= this.MIN_CONFIDENCE) {
          this.cacheResult(cacheKey, aiResult);
          return aiResult;
        }
      } catch (error) {
        console.error('[IntentClassifier] AI classification error:', error);
        // Fall through to keyword matching
      }
    }

    // Fallback to keyword matching
    return this.classifyWithKeywords(message);
  }

  private async classifyWithAI(message: string): Promise<IntentResult> {
    console.log('[IntentClassifier] Using AI classification for:', message);

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: `You are an intent classifier for Yappysol, a Solana DeFi chatbot. Analyze user messages and classify them.

CRITICAL: Distinguish between ACTIONABLE vs QUESTION intents:

ACTIONABLE INTENTS (isActionable: true):
- User wants to DO something NOW
- Imperative commands or direct requests
- Examples: "swap SOL for USDC", "create a token called MyCoin", "show my portfolio", "launch SuperToken"

QUESTION INTENTS (isActionable: false):
- User is asking HOW/WHAT/WHY about something
- Educational or informational queries
- Examples: "how do I swap tokens?", "what is token launching?", "can you explain swapping?"

INTENTS:
- swap: Token trading, exchange, convert, buy/sell operations
- launch: Token creation, minting, deployment
- price: Price queries, market data
- portfolio: Portfolio, holdings, balance queries
- trending: Trending tokens, hot tokens, market trends
- general: General questions, help, greetings

ENTITY EXTRACTION:
For swap: fromToken, toToken, amount, slippage
For launch: tokenName, tokenSymbol, description
For price: tokenSymbol, timeframe
For portfolio: timeframe
For trending: timeframe, limit

Return ONLY valid JSON, no markdown:
{
  "intent": "swap|launch|price|portfolio|trending|general",
  "confidence": 0.0-1.0,
  "entities": {},
  "reasoning": "brief explanation",
  "isActionable": true|false
}`
      }, {
        role: 'user',
        content: message
      }],
      temperature: 0.3,
      max_tokens: 200
    });

    const content = completion.choices[0].message.content?.trim() || '{}';
    
    // Clean up markdown if present
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const result = JSON.parse(jsonStr);

    console.log('[IntentClassifier] AI result:', result);

    return {
      intent: result.intent || 'general',
      confidence: result.confidence || 0.5,
      entities: result.entities || {},
      reasoning: result.reasoning,
      isActionable: result.isActionable !== undefined ? result.isActionable : this.determineActionability(message, result.intent)
    };
  }

  private classifyWithKeywords(message: string): IntentResult {
    console.log('[IntentClassifier] Using keyword matching for:', message);
    
    const lowerMessage = message.toLowerCase();
    
    // Swap intent
    const swapKeywords = ['swap', 'trade', 'exchange', 'convert', 'buy', 'sell'];
    if (swapKeywords.some(kw => lowerMessage.includes(kw))) {
      const intent = 'swap';
      return {
        intent,
        confidence: 0.8,
        entities: this.extractSwapEntities(message),
        isActionable: this.determineActionability(message, intent)
      };
    }

    // Launch intent
    const launchKeywords = ['create token', 'launch token', 'mint token', 'deploy token', 'new token'];
    if (launchKeywords.some(kw => lowerMessage.includes(kw))) {
      const intent = 'launch';
      return {
        intent,
        confidence: 0.8,
        entities: this.extractLaunchEntities(message),
        isActionable: this.determineActionability(message, intent)
      };
    }

    // Price intent
    const priceKeywords = ['price', 'cost', 'value', 'worth', 'how much'];
    if (priceKeywords.some(kw => lowerMessage.includes(kw))) {
      const intent = 'price';
      return {
        intent,
        confidence: 0.8,
        entities: this.extractPriceEntities(message),
        isActionable: this.determineActionability(message, intent)
      };
    }

    // Portfolio intent
    const portfolioKeywords = ['portfolio', 'holdings', 'balance', 'my tokens', 'what do i own'];
    if (portfolioKeywords.some(kw => lowerMessage.includes(kw))) {
      const intent = 'portfolio';
      return {
        intent,
        confidence: 0.8,
        entities: {},
        isActionable: this.determineActionability(message, intent)
      };
    }

    // Trending intent
    const trendingKeywords = ['trending', 'hot', 'popular', 'top tokens', 'top coins'];
    if (trendingKeywords.some(kw => lowerMessage.includes(kw))) {
      const intent = 'trending';
      return {
        intent,
        confidence: 0.8,
        entities: {},
        isActionable: this.determineActionability(message, intent)
      };
    }

    // General/fallback
    return {
      intent: 'general',
      confidence: 0.5,
      entities: {},
      isActionable: false
    };
  }

  private determineActionability(message: string, intent: string): boolean {
    const lowerMessage = message.toLowerCase();
    
    // Question patterns that indicate non-actionable intent
    const questionPatterns = [
      /^(how|what|why|when|where|can you|could you|would you|do you)/,
      /(how do i|how can i|how to|what is|what are|what does|explain|tell me about)/,
      /(can you help|can you explain|can you tell|what's the difference)/,
      /\?$/, // Ends with question mark
      /(help me understand|i want to learn|i don't understand)/
    ];
    
    // Check if it's a question
    const isQuestion = questionPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Imperative patterns that indicate actionable intent
    const imperativePatterns = [
      /^(swap|trade|exchange|convert|buy|sell|create|launch|mint|deploy|show|display|get)/,
      /(i want to|i need to|let's|please)/,
      /(do this|make this|execute|perform)/
    ];
    
    const isImperative = imperativePatterns.some(pattern => pattern.test(lowerMessage));
    
    // Special cases for specific intents
    if (intent === 'price' || intent === 'trending') {
      // Price and trending queries are usually informational, not actionable
      return !isQuestion && isImperative;
    }
    
    if (intent === 'portfolio') {
      // Portfolio queries can be both - "show my portfolio" vs "how do I check my portfolio"
      return !isQuestion || isImperative;
    }
    
    // For swap and launch, default to actionable unless it's clearly a question
    if (intent === 'swap' || intent === 'launch') {
      return !isQuestion || isImperative;
    }
    
    // Default: actionable if imperative, not actionable if question
    return isImperative && !isQuestion;
  }

  private extractSwapEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract amount first (more specific patterns)
    const amountPatterns = [
      /(\d+\.?\d*)\s+(SOL|USDC|USDT|BONK|WIF|JUP|JTO|PYTH|ORCA|RAY|tokens?)/i,
      /swap\s+(\d+\.?\d*)\s+(SOL|USDC|USDT|BONK|WIF|JUP|JTO|PYTH|ORCA|RAY)/i,
      /(\d+\.?\d*)\s+(SOL|USDC|USDT|BONK|WIF|JUP|JTO|PYTH|ORCA|RAY)\s+for/i
    ];
    
    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match) {
        entities.amount = match[1];
        // If amount is found with a token, that's likely the fromToken
        if (match[2] && !entities.fromToken) {
          entities.fromToken = match[2].toUpperCase();
        }
        break;
      }
    }
    
    // Extract token symbols (common ones) - improved logic
    const tokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY'];
    const upperMessage = message.toUpperCase();
    
    // Look for "for" pattern: "X for Y" or "X to Y"
    const swapPattern = /(\w+)\s+(?:for|to)\s+(\w+)/i;
    const swapMatch = message.match(swapPattern);
    
    if (swapMatch) {
      const token1 = swapMatch[1].toUpperCase();
      const token2 = swapMatch[2].toUpperCase();
      
      if (tokens.includes(token1)) {
        entities.fromToken = token1;
      }
      if (tokens.includes(token2)) {
        entities.toToken = token2;
      }
    } else {
      // Fallback: find tokens in order
      const foundTokens: string[] = [];
      for (const token of tokens) {
        if (upperMessage.includes(token)) {
          foundTokens.push(token);
        }
      }
      
      if (foundTokens.length >= 1) {
        entities.fromToken = foundTokens[0];
      }
      if (foundTokens.length >= 2) {
        entities.toToken = foundTokens[1];
      }
    }

    // Extract amount if not found yet
    if (!entities.amount) {
      const amountMatch = message.match(/(\d+\.?\d*)/);
      if (amountMatch) {
        entities.amount = amountMatch[1];
      }
    }

    console.log('[IntentClassifier] Extracted swap entities:', entities);
    return entities;
  }

  private extractLaunchEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract token name from patterns like "launch MyCoin" or "create token called MyToken"
    const namePatterns = [
      /(?:called|named)\s+([A-Z][a-zA-Z0-9]+)/,
      /(?:launch|create|mint)\s+(?:a\s+)?(?:token\s+)?([A-Z][a-zA-Z0-9]+)/,
      /([A-Z][a-zA-Z0-9]+)\s+token/
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        entities.tokenName = match[1];
        break;
      }
    }

    return entities;
  }

  private extractPriceEntities(message: string): Record<string, any> {
    const entities: Record<string, any> = {};
    
    // Extract token symbol
    const tokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY'];
    const upperMessage = message.toUpperCase();
    
    for (const token of tokens) {
      if (upperMessage.includes(token)) {
        entities.tokenSymbol = token;
        break;
      }
    }

    return entities;
  }

  private cacheResult(key: string, result: IntentResult): void {
    // Implement simple LRU cache
    if (this.cache.size >= this.CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, result);
  }

  /**
   * Clear the classification cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

