import { TokenLaunchModel, TokenPrice } from '../models/TokenLaunchSupabase';
import { supabase, TABLES } from '../lib/supabase';

export interface PriceData {
  priceUsd: number;
  marketCapUsd: number;
  volume24hUsd: number;
  liquidityUsd: number;
  holdersCount: number;
  priceChange24h: number;
}

export interface TokenPriceProvider {
  getTokenPrice(mintAddress: string): Promise<PriceData | null>;
  getMultipleTokenPrices(mintAddresses: string[]): Promise<Map<string, PriceData>>;
}

export class MoralisPriceProvider implements TokenPriceProvider {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://solana-gateway.moralis.io';

  constructor() {
    this.apiKey = process.env.MORALIS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('[MoralisPriceProvider] No API key provided');
    }
  }

  async getTokenPrice(mintAddress: string): Promise<PriceData | null> {
    if (!this.apiKey) {
      console.warn('[MoralisPriceProvider] No API key available');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseUrl}/token/${mintAddress}/price?chain=solana`,
        {
          headers: {
            'X-API-Key': this.apiKey,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error(`[MoralisPriceProvider] API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      return {
        priceUsd: parseFloat(data.usdPrice) || 0,
        marketCapUsd: parseFloat(data.usdPriceFormatted) * parseFloat(data.totalSupply) || 0,
        volume24hUsd: parseFloat(data.volume24h) || 0,
        liquidityUsd: parseFloat(data.liquidity) || 0,
        holdersCount: parseInt(data.holdersCount) || 0,
        priceChange24h: parseFloat(data.priceChange24h) || 0
      };
    } catch (error) {
      console.error('[MoralisPriceProvider] Error fetching price:', error);
      return null;
    }
  }

  async getMultipleTokenPrices(mintAddresses: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    
    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < mintAddresses.length; i += batchSize) {
      const batch = mintAddresses.slice(i, i + batchSize);
      const promises = batch.map(async (mintAddress) => {
        const priceData = await this.getTokenPrice(mintAddress);
        if (priceData) {
          results.set(mintAddress, priceData);
        }
      });
      
      await Promise.all(promises);
      
      // Add delay between batches to respect rate limits
      if (i + batchSize < mintAddresses.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    return results;
  }
}

export class DexScreenerPriceProvider implements TokenPriceProvider {
  private readonly baseUrl = 'https://api.dexscreener.com/latest';

  async getTokenPrice(mintAddress: string): Promise<PriceData | null> {
    try {
      const response = await fetch(`${this.baseUrl}/dex/tokens/${mintAddress}`);
      
      if (!response.ok) {
        console.error(`[DexScreenerPriceProvider] API error: ${response.status}`);
        return null;
      }

      const data = await response.json();
      
      if (!data.pairs || data.pairs.length === 0) {
        return null;
      }

      // Get the pair with highest liquidity
      const bestPair = data.pairs.reduce((best: any, current: any) => {
        return (current.liquidity?.usd || 0) > (best.liquidity?.usd || 0) ? current : best;
      });

      return {
        priceUsd: parseFloat(bestPair.priceUsd) || 0,
        marketCapUsd: parseFloat(bestPair.marketCap?.usd) || 0,
        volume24hUsd: parseFloat(bestPair.volume?.h24) || 0,
        liquidityUsd: parseFloat(bestPair.liquidity?.usd) || 0,
        holdersCount: parseInt(bestPair.info?.holdersCount) || 0,
        priceChange24h: parseFloat(bestPair.priceChange?.h24) || 0
      };
    } catch (error) {
      console.error('[DexScreenerPriceProvider] Error fetching price:', error);
      return null;
    }
  }

  async getMultipleTokenPrices(mintAddresses: string[]): Promise<Map<string, PriceData>> {
    const results = new Map<string, PriceData>();
    
    // DexScreener doesn't have batch endpoint, so we process individually
    for (const mintAddress of mintAddresses) {
      const priceData = await this.getTokenPrice(mintAddress);
      if (priceData) {
        results.set(mintAddress, priceData);
      }
      
      // Add delay to respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    
    return results;
  }
}

export class TokenPriceTrackingService {
  private providers: TokenPriceProvider[];
  private currentProviderIndex: number = 0;

  constructor() {
    this.providers = [
      new MoralisPriceProvider(),
      new DexScreenerPriceProvider()
    ];
  }

  private getCurrentProvider(): TokenPriceProvider {
    return this.providers[this.currentProviderIndex];
  }

  private switchProvider(): void {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
    console.log(`[TokenPriceTrackingService] Switched to provider ${this.currentProviderIndex}`);
  }

  async updateTokenPrices(): Promise<void> {
    try {
      console.log('[TokenPriceTrackingService] Starting price update...');
      
      // Get all completed launches that need price updates
      const launches = await this.getLaunchesNeedingPriceUpdate();
      
      if (launches.length === 0) {
        console.log('[TokenPriceTrackingService] No launches need price updates');
        return;
      }

      console.log(`[TokenPriceTrackingService] Updating prices for ${launches.length} tokens`);
      
      const mintAddresses = launches.map(l => l.mint_address).filter(Boolean) as string[];
      const priceData = await this.getMultipleTokenPrices(mintAddresses);
      
      // Update each launch with new price data
      for (const launch of launches) {
        if (!launch.mint_address) continue;
        
        const price = priceData.get(launch.mint_address);
        if (price) {
          await TokenLaunchModel.updateLaunch(launch.id, {
            currentPriceUsd: price.priceUsd,
            marketCapUsd: price.marketCapUsd,
            volume24hUsd: price.volume24hUsd,
            liquidityUsd: price.liquidityUsd,
            holdersCount: price.holdersCount,
            priceChange24h: price.priceChange24h
          });
          
          // Add price history record
          await TokenLaunchModel.addPriceRecord(launch.id, launch.mint_address, price);
          
          console.log(`[TokenPriceTrackingService] Updated price for ${launch.token_name}: $${price.priceUsd}`);
        } else {
          console.warn(`[TokenPriceTrackingService] No price data found for ${launch.token_name} (${launch.mint_address})`);
        }
      }
      
      console.log('[TokenPriceTrackingService] Price update completed');
    } catch (error) {
      console.error('[TokenPriceTrackingService] Error updating prices:', error);
      this.switchProvider();
    }
  }

  async getTokenPrice(mintAddress: string): Promise<PriceData | null> {
    try {
      return await this.getCurrentProvider().getTokenPrice(mintAddress);
    } catch (error) {
      console.error('[TokenPriceTrackingService] Error getting token price:', error);
      this.switchProvider();
      return null;
    }
  }

  async getMultipleTokenPrices(mintAddresses: string[]): Promise<Map<string, PriceData>> {
    try {
      return await this.getCurrentProvider().getMultipleTokenPrices(mintAddresses);
    } catch (error) {
      console.error('[TokenPriceTrackingService] Error getting multiple token prices:', error);
      this.switchProvider();
      return new Map();
    }
  }

  private async getLaunchesNeedingPriceUpdate(): Promise<any[]> {
    // Get launches that haven't been updated in the last hour
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('status', 'completed')
      .not('mint_address', 'is', null)
      .or(`last_price_update.is.null,last_price_update.lt.${oneHourAgo.toISOString()}`)
      .limit(100);

    if (error) {
      throw new Error(`Failed to get launches needing price update: ${error.message}`);
    }

    return data || [];
  }

  async updateUserHoldings(userId: string): Promise<void> {
    try {
      console.log(`[TokenPriceTrackingService] Updating holdings for user ${userId}`);
      
      // Get user's token holdings from their wallet
      const { WalletService } = await import('./WalletService');
      const wallet = await WalletService.getUserDefaultWallet(userId);
      
      if (!wallet) {
        console.log(`[TokenPriceTrackingService] No wallet found for user ${userId}`);
        return;
      }

      // TODO: Implement token balance fetching when WalletService methods are available
      // For now, this is a placeholder that will be implemented when the wallet service
      // has the necessary methods for fetching token balances
      console.log(`[TokenPriceTrackingService] Holdings update placeholder for user ${userId}`);
      
    } catch (error) {
      console.error(`[TokenPriceTrackingService] Error updating holdings for user ${userId}:`, error);
    }
  }
}

// Export singleton instance
export const tokenPriceTrackingService = new TokenPriceTrackingService();
