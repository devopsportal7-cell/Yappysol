import OpenAI from 'openai';

export interface EmbeddingResult {
  embedding: number[];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class EmbeddingService {
  private openai: OpenAI | null;
  private cache: Map<string, EmbeddingResult>;
  private readonly CACHE_SIZE = 1000; // Max 1000 cached embeddings

  constructor() {
    this.openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;
    this.cache = new Map<string, EmbeddingResult>();
  }

  async createEmbedding(text: string): Promise<EmbeddingResult> {
    if (!this.openai) {
      throw new Error('OpenAI API key not configured');
    }

    // Check cache first
    const cacheKey = text.toLowerCase().trim();
    if (this.cache.has(cacheKey)) {
      console.log('[EmbeddingService] Using cached embedding for:', text.substring(0, 50) + '...');
      return this.cache.get(cacheKey)!;
    }

    try {
      console.log('[EmbeddingService] Creating embedding for:', text.substring(0, 50) + '...');
      
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small', // Cost-effective and fast
        input: text,
      });

      const result: EmbeddingResult = {
        embedding: response.data[0].embedding,
        model: response.model,
        usage: response.usage
      };

      // Cache the result
      this.cache.set(cacheKey, result);
      this.manageCacheSize();

      console.log('[EmbeddingService] Embedding created successfully, tokens used:', result.usage.total_tokens);
      return result;

    } catch (error) {
      console.error('[EmbeddingService] Error creating embedding:', error);
      throw new Error(`Failed to create embedding: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private manageCacheSize(): void {
    if (this.cache.size > this.CACHE_SIZE) {
      // Remove oldest entries (simple LRU)
      const keysToDelete = Array.from(this.cache.keys()).slice(0, this.cache.size - this.CACHE_SIZE);
      keysToDelete.forEach(key => this.cache.delete(key));
      console.log(`[EmbeddingService] Cache cleaned, removed ${keysToDelete.length} entries`);
    }
  }

  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.CACHE_SIZE
    };
  }

  clearCache(): void {
    this.cache.clear();
    console.log('[EmbeddingService] Cache cleared');
  }
}

