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

Common token symbols: SOL, USDC, USDT, BONK, WIF, JUP, JTO, PYTH, ORCA, RAY, SAMO, FIDA

Examples:
"trade 5 SOL for USDC" → {"fromToken": "SOL", "toToken": "USDC", "amount": "5"}
"swap BONK to SOL" → {"fromToken": "BONK", "toToken": "SOL"}
"I want to buy 100 USDC with SOL" → {"fromToken": "SOL", "toToken": "USDC", "amount": "100"}

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
- tokenSymbol: Token to get price for

Examples:
"price of SOL" → {"tokenSymbol": "SOL"}
"how much is BONK" → {"tokenSymbol": "BONK"}

Return format: {"tokenSymbol": "..."}`,

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
    
    // Common Solana tokens
    const commonTokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY', 'SAMO', 'FIDA'];
    const upperMessage = message.toUpperCase();
    
    // Extract tokens mentioned
    const foundTokens: string[] = [];
    for (const token of commonTokens) {
      if (upperMessage.includes(token)) {
        foundTokens.push(token);
      }
    }

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
      /(?:swap|trade|exchange|convert|buy|sell)\s+(\d+\.?\d*)/i
    ];

    for (const pattern of amountPatterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        entities.amount = match[1];
        break;
      }
    }

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
    
    // Common Solana tokens
    const commonTokens = ['SOL', 'USDC', 'USDT', 'BONK', 'WIF', 'JUP', 'JTO', 'PYTH', 'ORCA', 'RAY'];
    const upperMessage = message.toUpperCase();
    
    // Find first mentioned token
    for (const token of commonTokens) {
      if (upperMessage.includes(token)) {
        entities.tokenSymbol = token;
        break;
      }
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

