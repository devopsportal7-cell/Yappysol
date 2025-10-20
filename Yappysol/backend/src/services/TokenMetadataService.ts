import axios from 'axios';
import config from '../config';
import NodeCache from 'node-cache';

interface TokenMetadata {
  name: string;
  symbol: string;
  mint: string;
  standard: string;
  tokenAddress: string;
  uri?: string;
}

class TokenMetadataService {
  private static instance: TokenMetadataService;
  private cache: NodeCache;
  private requestQueue: Promise<any>[] = [];
  private processingQueue: boolean = false;
  private readonly RATE_LIMIT_DELAY = 1000; // 1 second between requests
  private readonly CACHE_TTL = 3600; // 1 hour cache

  private constructor() {
    this.cache = new NodeCache({ stdTTL: this.CACHE_TTL });
  }

  public static getInstance(): TokenMetadataService {
    if (!TokenMetadataService.instance) {
      TokenMetadataService.instance = new TokenMetadataService();
    }
    return TokenMetadataService.instance;
  }

  private async processQueue() {
    if (this.processingQueue) return;
    this.processingQueue = true;

    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request;
          await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
        } catch (error) {
          console.error('Error processing request:', error);
        }
      }
    }

    this.processingQueue = false;
  }

  private async makeRequest(mintAccounts: string[]): Promise<any> {
    const cacheKey = mintAccounts.sort().join(',');
    const cachedData = this.cache.get(cacheKey);
    if (cachedData) {
      return cachedData;
    }


    const request = axios.post(
      `https://api.helius.xyz/v0/token-metadata?api-key=${config.HELIUS_API_KEY}`,
      {
        mintAccounts,
        includeOffChain: false,
        disableCache: false
      }
    ).then(response => {
      const data = response.data;
      this.cache.set(cacheKey, data);
      return data;
    });

    this.requestQueue.push(request);
    this.processQueue();
    return request;
  }

  public async getTokenMetadata(mint: string): Promise<TokenMetadata> {
    try {
      const response = await this.makeRequest([mint]);
      const metadata = response[0];
      
      if (!metadata) {
        throw new Error('No metadata found for token');
      }

      return {
        name: metadata.name || '',
        symbol: metadata.symbol || '',
        mint: metadata.mint || mint,
        standard: metadata.standard || '',
        tokenAddress: mint,
        uri: metadata.uri || undefined
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return {
        name: '',
        symbol: '',
        mint,
        standard: '',
        tokenAddress: mint,
        uri: undefined
      };
    }
  }

  public async getMultipleTokenMetadata(mints: string[]): Promise<TokenMetadata[]> {
    try {
      const response = await this.makeRequest(mints);
      return response.map((metadata: any) => ({
        name: metadata.name || '',
        symbol: metadata.symbol || '',
        mint: metadata.mint || '',
        standard: metadata.standard || '',
        tokenAddress: metadata.mint || '',
        uri: metadata.uri || undefined
      }));
    } catch (error) {
      console.error('Error fetching multiple token metadata:', error);
      return mints.map(mint => ({
        name: '',
        symbol: '',
        mint,
        standard: '',
        tokenAddress: mint,
        uri: undefined
      }));
    }
  }
}

export const tokenMetadataService = TokenMetadataService.getInstance(); 