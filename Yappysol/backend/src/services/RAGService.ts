import OpenAI from 'openai';
import { EmbeddingService } from './EmbeddingService';
import { KnowledgeBaseService } from './KnowledgeBaseService';

export interface RAGResult {
  answer: string;
  source: 'knowledge_base' | 'openai_fallback';
  confidence: number;
  sources: Array<{
    id: string;
    title?: string;
    content: string;
    similarity?: number;
    source_url?: string;
  }>;
  metadata: {
    query: string;
    haveKB: boolean;
    bestSimilarity: number;
    hasKeywordHits: boolean;
    hasTextHits: boolean;
    tokensUsed?: number;
  };
}

export class RAGService {
  private openai: OpenAI | null;
  private embeddingService: EmbeddingService;
  private knowledgeBaseService: KnowledgeBaseService;

  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.embeddingService = new EmbeddingService();
    this.knowledgeBaseService = new KnowledgeBaseService();
    
    console.log('[RAGService] Initialized with RAG capabilities');
  }

  /**
   * Main RAG method - tries knowledge base first, falls back to OpenAI
   */
  async answerQuestion(
    query: string,
    entities: any = {},
    context: any = {}
  ): Promise<RAGResult> {
    try {
      console.log('[RAGService] Processing question:', query.substring(0, 100) + '...');

      // Step 1: Create embedding for the query
      const embeddingResult = await this.embeddingService.createEmbedding(query);
      
      // Step 2: Search knowledge base
      const kbSearch = await this.knowledgeBaseService.hybridSearch(
        query,
        embeddingResult.embedding,
        entities,
        {
          matchCount: 4,
          matchThreshold: 0.78,
          keywordLimit: 8
        }
      );

      // Step 3: Decide whether to use KB or fallback
      // Only use KB if we have high-quality results with good similarity
      const hasGoodKBResults = kbSearch.haveKB && 
                              kbSearch.results.length > 0 && 
                              kbSearch.results[0]?.similarity > 0.7; // Higher threshold for quality
      
      if (hasGoodKBResults) {
        console.log('[RAGService] Using knowledge base answer (high similarity)');
        return await this.generateKBAnswer(query, kbSearch.results, context);
      } else {
        console.log('[RAGService] Knowledge base insufficient or low similarity, falling back to OpenAI');
        return await this.generateFallbackAnswer(query, context);
      }

    } catch (error) {
      console.error('[RAGService] Error processing question:', error);
      
      // If RAG fails completely, try OpenAI fallback
      try {
        return await this.generateFallbackAnswer(query, context);
      } catch (fallbackError) {
        console.error('[RAGService] Fallback also failed:', fallbackError);
        throw new Error(`RAG processing failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }

  /**
   * Generate answer using knowledge base results
   */
  private async generateKBAnswer(
    query: string,
    kbResults: any[],
    context: any
  ): Promise<RAGResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Prepare context from KB results
      const chunks = kbResults.map(r => r.content).filter(Boolean);
      const sources = kbResults.map(r => ({
        id: r.id,
        title: r.metadata?.title,
        content: r.content,
        similarity: r.similarity,
        source_url: r.metadata?.source_url
      }));

      // Create system prompt for KB-based answers
      const systemPrompt = `You are Yappysol, a helpful and knowledgeable Solana DeFi assistant. You have access to a curated knowledge base about Solana, DeFi, and crypto.

IMPORTANT RULES:
1. Use ONLY the provided context to answer questions
2. If the context doesn't contain enough information, say "I don't have enough information about that in my knowledge base"
3. Never invent contract addresses, token symbols, or specific technical details
4. Be concise but helpful
5. Maintain Yappysol's friendly and enthusiastic personality
6. If asked about portfolio/balance without platform context, ask which wallet/exchange they're using

Context from knowledge base:
${chunks.join('\n---\n')}`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Cost-effective for KB-based answers
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Question: ${query}` }
        ],
        temperature: 0.3, // Lower temperature for more factual responses
        max_tokens: 500,
      });

      const answer = completion.choices[0].message.content || 'I apologize, but I couldn\'t generate a response.';

      return {
        answer,
        source: 'knowledge_base',
        confidence: Math.min(0.9, kbResults[0]?.similarity || 0.7),
        sources,
        metadata: {
          query,
          haveKB: true,
          bestSimilarity: kbResults[0]?.similarity || 0,
          hasKeywordHits: true,
          hasTextHits: true,
          tokensUsed: completion.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error('[RAGService] Error generating KB answer:', error);
      throw new Error(`KB answer generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate fallback answer using OpenAI directly
   */
  private async generateFallbackAnswer(
    query: string,
    context: any
  ): Promise<RAGResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      const systemPrompt = `You are Yappysol, a knowledgeable and enthusiastic Solana DeFi assistant with expertise in cryptocurrency markets and investment strategies.

CORE CAPABILITIES:
- Solana blockchain and DeFi protocols
- Token swaps, launches, and trading strategies
- Portfolio management and risk analysis
- Market trends and token evaluation
- Investment advice with structured frameworks

RESPONSE STYLE:
- Provide structured, actionable advice with clear sections
- Use bullet points for easy reading
- Be conversational but professional
- Include specific strategies and risk management
- Offer follow-up questions to personalize advice

INVESTMENT QUESTIONS FRAMEWORK:
When asked about buying/selling crypto (especially Solana), provide:

1. **High-level take**: General market perspective and timeframe considerations
2. **How I'd approach it**: 
   - Sizing strategy (position sizing, DCA approach)
   - Risk management (stop losses, invalidation levels)
   - Take profit strategy (scaling out, profit targets)
3. **Bullish factors**: What could drive price higher
4. **Main risks**: Key risks and bearish factors
5. **Next steps**: Ask for timeframe/risk tolerance for personalized plan

EXAMPLE STRUCTURE FOR SOLANA QUESTIONS:
"**High-level take**: If your horizon is 6-18 months and you believe in Solana's growth (throughput, ecosystem, payments/gaming/memes), DCA in tranches is reasonable. If your horizon is short (days-weeks), entries matter more.

**How I'd approach it**:
• **Sizing**: Start with 20-30% of intended position, add on dips of 10-15% or at confirmed breakouts
• **Risk management**: Have an invalidation level (e.g., recent swing low). No leverage if unsure
• **Take profit**: Scale out 20-30% on +20-30% moves, let the rest ride if trend continues

**What could push SOL higher**: Ecosystem growth (DeFi/DEX volumes, memecoin activity), payment integrations, infra upgrades

**Main risks**: Network performance hiccups, regulatory headlines, macro risk-off, high beta drawdowns vs BTC/ETH

**Want a concrete plan?** Tell me your timeframe (e.g., '3-6 months') and I'll suggest a DCA plan with entries, invalidation, and take-profit levels."

IMPORTANT GUIDELINES:
- Never give specific price predictions or guarantees
- Always emphasize DYOR (Do Your Own Research)
- Ask clarifying questions about timeframe and risk tolerance
- Provide balanced analysis including both opportunities and risks
- Use emojis sparingly but effectively
- Be enthusiastic but responsible about risk`;

      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: query }
        ],
        temperature: 0.7, // Higher temperature for more creative responses
        max_tokens: 800, // Increased for more detailed responses
      });

      const answer = completion.choices[0].message.content || 'I apologize, but I couldn\'t generate a response.';

      return {
        answer,
        source: 'openai_fallback',
        confidence: 0.6, // Lower confidence for fallback
        sources: [],
        metadata: {
          query,
          haveKB: false,
          bestSimilarity: 0,
          hasKeywordHits: false,
          hasTextHits: false,
          tokensUsed: completion.usage?.total_tokens || 0
        }
      };

    } catch (error) {
      console.error('[RAGService] Error generating fallback answer:', error);
      throw new Error(`Fallback answer generation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): any {
    return {
      embedding: this.embeddingService.getCacheStats()
    };
  }

  /**
   * Clear all caches
   */
  clearCaches(): void {
    this.embeddingService.clearCache();
    console.log('[RAGService] All caches cleared');
  }
}
