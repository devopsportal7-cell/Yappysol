import OpenAI from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

export interface ExtractedEntities {
  [key: string]: any;
}

export class EntityExtractor {
  /**
   * Extract entities from message based on intent
   */
  async extractEntities(message: string, intent: string): Promise<ExtractedEntities> {
    // If AI is available and intent needs entity extraction, use AI
    if (openai && this.shouldUseAI(intent)) {
      try {
        return await this.extractWithAI(message, intent);
      } catch (error) {
        console.error('[EntityExtractor] AI extraction error:', error);
        // Fall through to keyword extraction
      }
    }

    // Fallback to keyword-based extraction
    return this.extractWithKeywords(message, intent);
  }

  private shouldUseAI(intent: string): boolean {
    // Use AI for complex intents that benefit from NLP
    return ['swap', 'launch'].includes(intent);
  }

  private async extractWithAI(message: string, intent: string): Promise<ExtractedEntities> {
    console.log('[EntityExtractor] Using AI extraction for:', intent, message);

    const prompt = this.buildExtractionPrompt(intent);

    const completion = await openai!.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{
        role: 'system',
        content: prompt
      }, {
        role: 'user',
        content: message
      }],
      temperature: 0.2,
      max_tokens: 150
    });

    const content = completion.choices[0].message.content?.trim() || '{}';
    
    // Clean up markdown if present
    const jsonStr = content.replace(/```json\n?|\n?```/g, '').trim();
    const entities = JSON.parse(jsonStr);

    console.log('[EntityExtractor] AI extracted entities:', entities);
    return entities;
  }

  private buildExtractionPrompt(intent: string): string {
    const prompts: Record<string, string> = {
      swap: `Extract swap-related entities from the user message. Return ONLY valid JSON, no markdown.

Entities to extract:
- fromToken: Source token symbol (SOL, USDC, BONK, etc.)
- toToken: Destination token symbol
- amount: Numeric amount to swap (just the number)
- slippage: Optional slippage tolerance percentage

Common token symbols: SOL, USDC, USDT, BONK, WIF, JUP, JTO, PYTH, ORCA, RAY, SAMO, FIDA, RAY, SRM, MNGO, STEP, COPE, ROPE, KIN, MAPS, OXY, ATLAS, POLIS, LIKE, MEDIA, TULIP, SLND, PORT, mSOL, stSOL, scnSOL, ETH, BTC

IMPORTANT: Handle token name variations:
- "solana" or "sol" → "SOL"
- "usdc" → "USDC" 
- "usdt" → "USDT"
- "bonk" → "BONK"

Examples:
"trade 5 SOL for USDC" → {"fromToken": "SOL", "toToken": "USDC", "amount": "5"}
"swap BONK to SOL" → {"fromToken": "BONK", "toToken": "SOL"}
"I want to buy 100 USDC with SOL" → {"fromToken": "SOL", "toToken": "USDC", "amount": "100"}
"I want to swap usdc for solana" → {"fromToken": "USDC", "toToken": "SOL"}
"swap solana for USDC" → {"fromToken": "SOL", "toToken": "USDC"}
"convert 1.5 SOL to BONK" → {"fromToken": "SOL", "toToken": "BONK", "amount": "1.5"}

Return format: {"fromToken": "...", "toToken": "...", "amount": "..."}`,

      launch: `Extract token creation entities from the user message. Return ONLY valid JSON, no markdown.

Entities to extract:
- tokenName: Full name of the token
- tokenSymbol: Short symbol/ticker (if mentioned)
- description: Brief description (if mentioned)

Examples:
"launch a token called MyCoin" → {"tokenName": "MyCoin"}
"create MOON token for my project" → {"tokenName": "MOON", "tokenSymbol": "MOON"}
"mint SuperToken with symbol ST" → {"tokenName": "SuperToken", "tokenSymbol": "ST"}

Return format: {"tokenName": "...", "tokenSymbol": "..."}`,

      price: `Extract price query entities from the user message. Return ONLY valid JSON, no markdown.

Entities to extract:
- tokenSymbols: Array of all token symbols mentioned (can be multiple)

Examples:
"price of SOL" → {"tokenSymbols": ["SOL"]}
"how much is BONK" → {"tokenSymbols": ["BONK"]}
"what is the price of bonk and sol" → {"tokenSymbols": ["BONK", "SOL"]}
"price of SOL and BONK" → {"tokenSymbols": ["SOL", "BONK"]}

IMPORTANT: Extract ALL mentioned tokens, not just one!

Return format: {"tokenSymbols": ["TOKEN1", "TOKEN2", ...]}`,

      portfolio: `Extract portfolio query entities. Return ONLY valid JSON, no markdown.

Return format: {}`,

      trending: `Extract trending query entities. Return ONLY valid JSON, no markdown.

Entities to extract:
- limit: Number of results (if mentioned)

Return format: {"limit": 10}`
    };

    return prompts[intent] || 'Extract relevant entities from the message. Return ONLY valid JSON, no markdown.';
  }

  private extractWithKeywords(message: string, intent: string): ExtractedEntities {
    console.log('[EntityExtractor] Using keyword extraction for:', intent, message);

    switch (intent) {
      case 'swap':
        return this.extractSwapEntities(message);
      case 'launch':
        return this.extractLaunchEntities(message);
      case 'price':
        return this.extractPriceEntities(message);
      case 'portfolio':
        return {};
      case 'trending':
        return this.extractTrendingEntities(message);
      default:
        return {};
    }
  }

  private extractSwapEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};
    
    // Common Solana tokens (expanded list)
    const commonTokens = [
      'SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY', 'SAMO', 'FIDA',
      'RAY', 'SRM', 'MNGO', 'STEP', 'COPE', 'ROPE', 'KIN', 'MAPS', 'OXY', 'ATLAS', 'POLIS',
      'LIKE', 'MEDIA', 'TULIP', 'SLND', 'PORT', 'mSOL', 'stSOL', 'scnSOL', 'ETH', 'BTC'
    ];
    const upperMessage = message.toUpperCase();
    
    // Enhanced pattern matching for "X for Y" or "X to Y" patterns
    const swapPatterns = [
      // Direct patterns
      /(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i,  // "1 SOL for USDC"
      /(\w+)\s+(?:for|to)\s+(\w+)/i,                 // "SOL for USDC"
      
      // Action-based patterns
      /swap\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "swap 1 SOL for USDC"
      /trade\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "trade 1 SOL for USDC"
      /exchange\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "exchange 1 SOL for USDC"
      /convert\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "convert 1 SOL for USDC"
      
      // Buy/sell patterns
      /buy\s+(\d+\.?\d*)\s+(\w+)\s+with\s+(\w+)/i,   // "buy 100 USDC with SOL"
      /sell\s+(\d+\.?\d*)\s+(\w+)\s+for\s+(\w+)/i,    // "sell 1 SOL for USDC"
      
      // Natural language patterns
      /i\s+want\s+to\s+swap\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to swap 1 SOL for USDC"
      /i\s+want\s+to\s+trade\s+(\d+\.?\d*)\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to trade 1 SOL for USDC"
      /i\s+want\s+to\s+swap\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to swap SOL for USDC"
      /i\s+want\s+to\s+trade\s+(\w+)\s+(?:for|to)\s+(\w+)/i, // "I want to trade SOL for USDC"
      
      // Token name variations (solana -> SOL)
      /(\d+\.?\d*)\s+(?:solana|sol)\s+(?:for|to)\s+(\w+)/i, // "1 solana for USDC"
      /(?:solana|sol)\s+(?:for|to)\s+(\w+)/i, // "solana for USDC"
      /(\w+)\s+(?:for|to)\s+(?:solana|sol)/i, // "USDC for solana"
    ];

    let foundMatch = false;
    for (const pattern of swapPatterns) {
      const match = message.match(pattern);
      if (match) {
        console.log('[EntityExtractor] Pattern matched:', pattern.source, 'Match:', match);
        
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
        if (commonTokens.includes(token1)) {
          entities.fromToken = token1;
        }
        if (commonTokens.includes(token2)) {
          entities.toToken = token2;
        }
        
        foundMatch = true;
        break;
      }
    }

    // Fallback: if no pattern matched, try simple token detection
    if (!foundMatch) {
      console.log('[EntityExtractor] No pattern matched, trying fallback token detection');
      
      // First, normalize the message for better token detection
      const normalizedMessage = message.toLowerCase()
        .replace(/solana/g, 'SOL')
        .replace(/sol\b/g, 'SOL')
        .replace(/usdc/g, 'USDC')
        .replace(/usdt/g, 'USDT')
        .replace(/bonk/g, 'BONK');
      
      const upperNormalized = normalizedMessage.toUpperCase();
      
      const foundTokens: string[] = [];
      for (const token of commonTokens) {
        if (upperNormalized.includes(token)) {
          foundTokens.push(token);
        }
      }

      console.log('[EntityExtractor] Found tokens in fallback:', foundTokens);

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

    console.log('[EntityExtractor] Extracted swap entities:', entities);
    return entities;
  }

  private extractLaunchEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};
    
    // Extract token name from various patterns
    const namePatterns = [
      /(?:called|named)\s+([A-Z][a-zA-Z0-9]+)/,
      /(?:launch|create|mint)\s+(?:a\s+)?(?:token\s+)?([A-Z][a-zA-Z0-9]+)/,
      /([A-Z][a-zA-Z0-9]+)\s+token/
    ];

    for (const pattern of namePatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        entities.tokenName = match[1];
        // Use the same for symbol if not explicitly provided
        if (!entities.tokenSymbol) {
          entities.tokenSymbol = match[1].substring(0, 5).toUpperCase();
        }
        break;
      }
    }

    return entities;
  }

  private extractPriceEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};
    
    // Common Solana tokens (expanded list)
    const commonTokens = [
      'SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY', 
      'SRM', 'SAMO', 'MNGO', 'STEP', 'COPE', 'ROPE', 'KIN', 'MAPS', 'ETH', 'BTC'
    ];
    const upperMessage = message.toUpperCase();
    
    // Find all mentioned tokens (not just the first one)
    const foundTokens: string[] = [];
    for (const token of commonTokens) {
      if (upperMessage.includes(token) && !foundTokens.includes(token)) {
        foundTokens.push(token);
      }
    }

    // Store as array for multiple token support
    if (foundTokens.length > 0) {
      // For backwards compatibility, keep single tokenSymbol
      entities.tokenSymbol = foundTokens[0];
      // New: support multiple tokens
      entities.tokenSymbols = foundTokens;
    }

    return entities;
  }

  private extractTrendingEntities(message: string): ExtractedEntities {
    const entities: ExtractedEntities = {};
    
    // Extract limit if mentioned
    const limitMatch = message.match(/(?:top|show|get)\s+(\d+)/i);
    if (limitMatch) {
      entities.limit = parseInt(limitMatch[1], 10);
    }

    return entities;
  }
}

