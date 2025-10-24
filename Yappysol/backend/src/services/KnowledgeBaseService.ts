import { createClient } from '@supabase/supabase-js';

export interface KnowledgeBaseResult {
  id: string;
  content: string;
  metadata: {
    title?: string;
    source_url?: string;
    source_type?: string;
    chain?: string;
    token?: string;
    [key: string]: any;
  };
  similarity: number;
  doc_id?: string;
  line?: number;
  _source?: string;
  _score?: number;
}

export interface VectorSearchParams {
  query_embedding: number[];
  match_count?: number;
  match_threshold?: number;
  filter?: {
    chain?: string | null;
    token?: string | null;
  };
}

export interface KeywordSearchParams {
  query: string;
  limit?: number;
}

export class KnowledgeBaseService {
  private supabase: any;
  private readonly SUPABASE_URL = process.env.SUPABASE_URL;
  private readonly SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

  constructor() {
    if (!this.SUPABASE_URL || !this.SUPABASE_ANON_KEY) {
      throw new Error('Supabase configuration missing');
    }

    this.supabase = createClient(this.SUPABASE_URL, this.SUPABASE_ANON_KEY);
    console.log('[KnowledgeBaseService] Initialized with Supabase');
  }

  /**
   * Search using vector similarity (semantic search)
   */
  async vectorSearch(params: VectorSearchParams): Promise<KnowledgeBaseResult[]> {
    try {
      console.log('[KnowledgeBaseService] Performing vector search with params:', {
        match_count: params.match_count,
        match_threshold: params.match_threshold,
        filter: params.filter
      });

      const { data, error } = await this.supabase.rpc('match_documents', {
        query_embedding: params.query_embedding,
        match_count: params.match_count || 4,
        match_threshold: params.match_threshold || 0.78,
        filter: params.filter || {}
      });

      if (error) {
        console.error('[KnowledgeBaseService] Vector search error:', error);
        throw new Error(`Vector search failed: ${error.message}`);
      }

      const results: KnowledgeBaseResult[] = (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        metadata: item.metadata || {},
        similarity: item.similarity || 0,
        doc_id: item.doc_id,
        line: item.line
      }));

      console.log(`[KnowledgeBaseService] Vector search returned ${results.length} results`);
      return results;

    } catch (error) {
      console.error('[KnowledgeBaseService] Vector search error:', error);
      throw new Error(`Vector search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Search using keyword matching (text search)
   */
  async keywordSearch(params: KeywordSearchParams): Promise<KnowledgeBaseResult[]> {
    try {
      console.log('[KnowledgeBaseService] Performing keyword search for:', params.query);

      const { data, error } = await this.supabase
        .from('kb_chunks')
        .select('id, content, metadata, metadata->>title, metadata->>source_url, metadata->>source_type')
        .or(`content.wfts(english).${encodeURIComponent(params.query)},metadata->>title.ilike.*${encodeURIComponent(params.query)}*`)
        .limit(params.limit || 8);

      if (error) {
        console.error('[KnowledgeBaseService] Keyword search error:', error);
        throw new Error(`Keyword search failed: ${error.message}`);
      }

      const results: KnowledgeBaseResult[] = (data || []).map((item: any) => ({
        id: item.id,
        content: item.content,
        metadata: item.metadata || {},
        similarity: 0, // Keyword search doesn't have similarity scores
        doc_id: item.id,
        line: 0
      }));

      console.log(`[KnowledgeBaseService] Keyword search returned ${results.length} results`);
      return results;

    } catch (error) {
      console.error('[KnowledgeBaseService] Keyword search error:', error);
      throw new Error(`Keyword search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Hybrid search combining vector and keyword results
   */
  async hybridSearch(
    query: string,
    queryEmbedding: number[],
    entities: any = {},
    options: {
      matchCount?: number;
      matchThreshold?: number;
      keywordLimit?: number;
    } = {}
  ): Promise<{
    results: KnowledgeBaseResult[];
    haveKB: boolean;
    bestSimilarity: number;
    hasKeywordHits: boolean;
    hasTextHits: boolean;
  }> {
    try {
      console.log('[KnowledgeBaseService] Starting hybrid search for:', query);

      // Configuration
      const HIGH_SIM = 0.28;   // solid semantic match
      const LOW_SIM = 0.20;   // weak-but-acceptable
      const REQUIRE_TEXT_HIT_IF_LOW = true;
      const TOP_K = 8;

      // Domain stopwords
      const stop = new Set([
        'the','a','an','and','or','of','to','on','in','is','it','i','me','my','can','how',
        'do','did','you','we','for','this','that','here','there','be','able','should',
        'token','tokens','coin','coins','crypto','platform','check','see','hold','holding',
        'portfolio','balance'
      ]);

      // Portfolio/balance intent words
      const portfolioWords = new Set(['portfolio','balance','balances','holdings','assets']);

      // Known platform keywords
      const platforms = [
        'phantom','solflare','backpack','metamask','rabby','okx','binance','bybit','kraken',
        'coinbase','jupiter','pump','raydium','orca','dexscreener','solscan','bscscan','etherscan',
        'solana','bsc','ethereum','eth','polygon','matic','base','arbitrum','optimism'
      ].map(s => s.toLowerCase());

      // Tokenize query
      const qTokens = (query.toLowerCase().match(/[a-z0-9]+/g) || [])
        .filter(t => !stop.has(t));

      // Detect portfolio intent
      const hasPortfolioIntent = qTokens.some(t => portfolioWords.has(t)) ||
                               /portfolio|balance|holdings|assets/i.test(query);

      // Detect platform mention in query
      const platformInQuery = platforms.find(p => query.toLowerCase().includes(p)) || null;

      // Check text hits in returned rows
      const hasTextHit = (row: KnowledgeBaseResult) => {
        const text = ((row.content ?? '') + ' ' + (row.metadata?.title ?? '')).toLowerCase();
        return qTokens.some(t => t.length >= 3 && text.includes(t));
      };

      // Perform searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.vectorSearch({
          query_embedding: queryEmbedding,
          match_count: options.matchCount || 4,
          match_threshold: options.matchThreshold || 0.78,
          filter: {
            chain: entities.chain || null,
            token: entities.token_address || entities.mint_or_addr || entities.token_symbol || entities.token_name || null
          }
        }),
        this.keywordSearch({
          query: query,
          limit: options.keywordLimit || 8
        })
      ]);

      // Tag sources
      const vectorTagged = vectorResults.map(r => ({ ...r, _source: 'vector' }));
      const keywordTagged = keywordResults.map(r => ({ ...r, _source: 'keyword' }));

      // Combine and deduplicate
      let combined = [...vectorTagged, ...keywordTagged];
      
      // Deduplicate by doc_id + line + content prefix
      const seen = new Set();
      combined = combined.filter(r => {
        const key = `${r.doc_id ?? ''}-${r.line ?? ''}-${(r.content || '').slice(0, 120)}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });

      // Hybrid scoring (boost keyword results slightly)
      const KW_BOOST = 0.05;
      combined = combined.map(r => {
        const sim = typeof r.similarity === 'number' ? r.similarity : 0;
        const boost = r._source === 'keyword' ? KW_BOOST : 0;
        return { ...r, _score: sim + boost };
      });

      // Sort and limit
      combined.sort((a, b) => (b._score ?? 0) - (a._score ?? 0));
      const topResults = combined.slice(0, TOP_K);

      // Analyze results
      let bestSimilarity = 0;
      let vecAboveLow = 0;
      let kwHit = false;
      let textHitAny = false;

      for (const r of topResults) {
        const s = Number(r.similarity ?? r._score ?? 0) || 0;
        const src = (r as any)._source;
        
        if (src === 'vector') {
          bestSimilarity = Math.max(bestSimilarity, s);
          if (s >= LOW_SIM) vecAboveLow++;
        }
        if (src === 'keyword') kwHit = true;
        if (hasTextHit(r)) textHitAny = true;
      }

      // Decide if KB is good enough
      let haveKB = false;

      // Strong vector alone is enough
      if (bestSimilarity >= HIGH_SIM) {
        haveKB = true;
      }
      // Medium vector needs extra evidence
      else if (bestSimilarity >= LOW_SIM) {
        haveKB = kwHit || (!REQUIRE_TEXT_HIT_IF_LOW || textHitAny);
      }
      // Multiple weak vector hits
      else if (vecAboveLow >= 2) {
        haveKB = true;
      }
      // Pure keyword route
      else if (kwHit && textHitAny) {
        haveKB = true;
      }

      console.log('[KnowledgeBaseService] Hybrid search completed:', {
        totalResults: topResults.length,
        haveKB,
        bestSimilarity,
        hasKeywordHits: kwHit,
        hasTextHits: textHitAny,
        hasPortfolioIntent,
        platformInQuery
      });

      return {
        results: topResults,
        haveKB,
        bestSimilarity,
        hasKeywordHits: kwHit,
        hasTextHits: textHitAny
      };

    } catch (error) {
      console.error('[KnowledgeBaseService] Hybrid search error:', error);
      throw new Error(`Hybrid search failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}