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
  private readonly MIN_CONFIDENCE = 0.8; // Higher threshold for more reliable classification

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
        content: `You are an intent classifier for Yappysol, a Solana DeFi chatbot. Analyze user messages SEMANTICALLY - understand MEANING, not just keywords.

CRITICAL: Use semantic understanding, not keyword matching!

ACTIONABLE INTENTS (isActionable: true):
- User wants to DO something NOW or GET their data
- Imperative commands or direct requests
- Examples: "swap SOL for USDC", "create a token called MyCoin", "what's in my wallet", "launch SuperToken"

QUESTION INTENTS (isActionable: false):
- User is asking HOW/WHAT/WHY about GENERAL concepts (not their personal data)
- Educational or informational queries about concepts
- Examples: "how do I swap tokens?", "what is token launching?", "can you explain swapping?"

SMART DISTINCTION - "What is my..." questions:
- "what is my portfolio" → PORTFOLIO intent (actionable: true) - User wants THEIR data
- "what is my balance" → PORTFOLIO intent (actionable: true) - User wants THEIR data
- "what is a token launch" → GENERAL intent (actionable: false) - User asking about a concept
- "what is swapping" → GENERAL intent (actionable: false) - User asking about a concept

RULE: If "what is" + "my" → Always actionable (user wants their data)
      If "what is" + NO "my" → Usually general question about concepts

INTENTS (understand SEMANTICALLY, not just keywords):
- swap: User wants to trade/exchange tokens (any phrasing: "swap", "convert", "trade", "exchange")
- launch: User wants to create/mint a token (any phrasing: "launch", "create", "make token", "mint")
- price: User asking about token price/market data
- portfolio: User asking about THEIR OWN tokens/balance/holdings (variations: "my tokens", "what I have", "my balance", "portfolio", "holdings", "everything I own", "what's in my wallet")
- trending: User asking about trending/popular tokens
- general: General questions, help, greetings

PORTFOLIO INTENT EXAMPLES (understand all of these):
- "what is my current portfolio" → PORTFOLIO, actionable: true (user wants THEIR data)
- "what tokens do i own" → PORTFOLIO, actionable: true
- "everything i have" → PORTFOLIO, actionable: true
- "what's in my wallet" → PORTFOLIO, actionable: true
- "show me what i own" → PORTFOLIO, actionable: true
- "my balance" → PORTFOLIO, actionable: true
- "my holdings" → PORTFOLIO, actionable: true
- "what are my assets" → PORTFOLIO, actionable: true
- Any question about user's personal tokens/balance

ENTITY EXTRACTION:
For swap: fromToken, toToken, amount, slippage
For launch: tokenName, tokenSymbol, description
For price: tokenSymbol, timeframe
For portfolio: timeframe
For trending: timeframe, limit

IMPORTANT: Use SEMANTIC understanding. Don't rely on exact keywords. Understand user intent.

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
      temperature: 0.1, // Lower temperature for more consistent classification
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

    // Portfolio intent - AI-powered detection (flexible matching)
    // Match patterns like: "what's in my...", "what do I own...", "show me my..."
    const portfolioPatterns = [
      /(portfolio|holdings|balance|assets|tokens|coins)/,
      /(what's in my|what do i own|what do i have|my.*tokens|my.*coins)/,
      /(what is my|what are my|what's my)/,  // "what is my current portfolio"
      /(show me my|display my|get my|see my)/,
      /(how much|how many).*(do i have|i own|is in).*wallet/,
      /(list|show|display).*(my tokens|my coins|my portfolio|my assets)/
    ];
    
    const hasPortfolioPattern = portfolioPatterns.some(pattern => pattern.test(lowerMessage));
    
    // Additional semantic checks for portfolio-related queries
    const portfolioSemantic = 
      (lowerMessage.includes('wallet') && (lowerMessage.includes('content') || lowerMessage.includes('contains'))) ||
      (lowerMessage.includes('account') && (lowerMessage.includes('balance') || lowerMessage.includes('value'))) ||
      (lowerMessage.includes('current') && (lowerMessage.includes('portfolio') || lowerMessage.includes('balance'))) ||
      (lowerMessage.includes('everything') && lowerMessage.includes('own'));
    
    if (hasPortfolioPattern || portfolioSemantic) {
      console.log('[IntentClassifier] ✅ Portfolio intent detected via keyword fallback!');
      const intent = 'portfolio';
      return {
        intent,
        confidence: 0.9, // High confidence for portfolio queries
        entities: {},
        isActionable: true // Portfolio queries are always actionable
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
    
    // Enhanced token list with more tokens
    const tokens = [
      'SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY', 'SAMO', 'FIDA',
      'RAY', 'SRM', 'MNGO', 'STEP', 'COPE', 'ROPE', 'KIN', 'MAPS', 'OXY', 'ATLAS', 'POLIS',
      'LIKE', 'MEDIA', 'TULIP', 'SLND', 'PORT', 'mSOL', 'stSOL', 'scnSOL', 'ETH', 'BTC'
    ];
    
    // Normalize message for better token detection
    const normalizedMessage = message.toLowerCase()
      .replace(/solana/g, 'SOL')
      .replace(/sol\b/g, 'SOL')
      .replace(/usdc/g, 'USDC')
      .replace(/usdt/g, 'USDT')
      .replace(/bonk/g, 'BONK');
    
    const upperMessage = normalizedMessage.toUpperCase();
    
    // Enhanced pattern matching for "X for Y" or "X to Y" patterns
    const swapPatterns = [
      /(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,  // "1 SOL for USDC"
      /(\w+)\s+(?:for|to)\s+(\w+)/i,                 // "SOL for USDC"
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "swap 1 SOL for USDC"
      /trade\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "trade 1 SOL for USDC"
      /i\s+want\s+to\s+swap\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to swap SOL for USDC"
      /i\s+want\s+to\s+trade\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to trade SOL for USDC"
      /(\d+\.?\d*)\s+(?:solana|sol)\s+(?:for|to)\s+(\w+)/i, // "1 solana for USDC"
      /(?:solana|sol)\s+(?:for|to)\s+(\w+)/i, // "solana for USDC"
      /(\w+)\s+(?:for|to)\s+(?:solana|sol)/i, // "USDC for solana"
    ];
    
    let foundMatch = false;
    for (const pattern of swapPatterns) {
      const match = message.match(pattern);
      if (match) {
        console.log('[IntentClassifier] Pattern matched:', pattern.source, 'Match:', match);
        
        // Extract amount if present
        if (match[1] && !isNaN(parseFloat(match[1]))) {
          entities.amount = match[1];
        }
        
        // Extract tokens with better logic
        let token1: string, token2: string;
        
        if (match.length === 4) {
          // Pattern with amount: match[1] = amount, match[2] = token1, match[3] = token2
          token1 = match[2].toUpperCase();
          token2 = match[3].toUpperCase();
        } else if (match.length === 3) {
          // Pattern without amount: match[1] = token1, match[2] = token2
          token1 = match[1].toUpperCase();
          token2 = match[2].toUpperCase();
        } else {
          continue; // Skip malformed matches
        }
        
        // Handle token name variations
        if (token1 === 'SOLANA') token1 = 'SOL';
        if (token2 === 'SOLANA') token2 = 'SOL';
        
        // Validate tokens against common list
        if (tokens.includes(token1)) {
          entities.fromToken = token1;
        }
        if (tokens.includes(token2)) {
          entities.toToken = token2;
        }
        
        foundMatch = true;
        break;
      }
    }
    
    // Fallback: if no pattern matched, try simple token detection
    if (!foundMatch) {
      console.log('[IntentClassifier] No pattern matched, trying fallback token detection');
      
      const foundTokens: string[] = [];
      for (const token of tokens) {
        if (upperMessage.includes(token)) {
          foundTokens.push(token);
        }
      }

      console.log('[IntentClassifier] Found tokens in fallback:', foundTokens);

      // Assign found tokens
      if (foundTokens.length > 0) {
        entities.fromToken = foundTokens[0];
      }
      if (foundTokens.length > 1) {
        entities.toToken = foundTokens[1];
      }

      // Extract amount - look for patterns like "5 SOL", "1.5 USDC", "100 tokens"
      const amountPatterns = [
        /(\d+\.?\d*)\s*(?:SOL|USDC|USDT|BONK|WIF|tokens?)/i,
        /(?:swap|trade|exchange|convert|buy|sell)\s+(\d+\.?\d*)/i,
        /(\d+\.?\d*)\s+(?:of|in)\s+(?:SOL|USDC|USDT|BONK)/i
      ];

      for (const pattern of amountPatterns) {
        const match = message.match(pattern);
        if (match && match[1]) {
          entities.amount = match[1];
          break;
        }
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

