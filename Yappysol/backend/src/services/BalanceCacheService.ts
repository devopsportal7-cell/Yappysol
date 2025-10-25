import { supabase, TABLES } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface TokenBalance {
  mint: string;
  symbol: string;
  name?: string;
  accountUnit: string;
  uiAmount: number;
  priceUsd: number;
  solEquivalent: number;
  usdEquivalent: number;
  image?: string;
  solscanUrl: string;
  decimals: number;
}

export interface WalletPortfolio {
  totalSolValue: number;
  totalUsdValue: number;
  tokens: TokenBalance[];
}

export interface CachedPortfolio {
  wallet_address: string;
  total_sol_value: number;
  total_usd_value: number;
  portfolio_updated: string;
  created_at: string;
}

export class BalanceCacheService {
  private cacheValidityMinutes = 5; // Cache valid for 5 minutes

  /**
   * Get wallet portfolio from cache, fallback to Helius if not cached
   */
  async getFromCache(walletAddress: string): Promise<WalletPortfolio | null> {
    try {
      // Check cache first
      const { data: cachedData, error } = await supabase
        .from('wallet_balance_cache')
        .select(`
          wallet_address,
          total_sol_value,
          total_usd_value,
          last_updated
        `)
        .eq('wallet_address', walletAddress)
        .single();

      if (error || !cachedData) {
        logger.info('[CACHE] Cache miss, fetching from Helius', { walletAddress });
        return await this.fetchFromHelius(walletAddress);
      }

      // Check if cache is still valid
      if (this.isCacheValid(cachedData.last_updated)) {
        logger.info('[CACHE] Cache hit, returning cached data', { walletAddress });
        
        // Get token balances from cache
        const tokenBalances = await this.getTokenBalancesFromCache(walletAddress);
        
        return {
          totalSolValue: cachedData.total_sol_value,
          totalUsdValue: cachedData.total_usd_value,
          tokens: tokenBalances
        };
      } else {
        logger.info('[CACHE] Cache expired, fetching from Helius', { walletAddress });
        return await this.fetchFromHelius(walletAddress);
      }
    } catch (error) {
      logger.error('[CACHE] Error getting from cache', { error, walletAddress });
      return await this.fetchFromHelius(walletAddress);
    }
  }

  /**
   * Update cache with fresh portfolio data
   */
  async updateCache(walletAddress: string, portfolio: WalletPortfolio): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      // Update wallet totals
      const { error: walletError } = await supabase
        .from('wallet_balance_cache')
        .upsert({
          wallet_address: walletAddress,
          total_sol_value: portfolio.totalSolValue,
          total_usd_value: portfolio.totalUsdValue,
          last_updated: now
        }, { onConflict: 'wallet_address' });

      if (walletError) {
        logger.error('[CACHE] Error updating wallet balance cache', { error: walletError, walletAddress });
        throw walletError;
      }

      // Update individual token balances
      for (const token of portfolio.tokens) {
        const { error: tokenError } = await supabase
          .from('token_balance_cache')
          .upsert({
            wallet_address: walletAddress,
            token_mint: token.mint,
            token_symbol: token.symbol,
            token_name: token.name,
            account_unit: token.accountUnit,
            ui_amount: token.uiAmount,
            price_usd: token.priceUsd,
            sol_equivalent: token.solEquivalent,
            usd_equivalent: token.usdEquivalent,
            token_image: token.image,
            solscan_url: token.solscanUrl,
            decimals: token.decimals,
            last_updated: now
          }, { onConflict: 'wallet_address,token_mint' });

        if (tokenError) {
          logger.error('[CACHE] Error updating token balance cache', { 
            error: tokenError, 
            walletAddress, 
            tokenMint: token.mint 
          });
        }
      }
      
      logger.info('[CACHE] Updated cache for wallet', { 
        walletAddress, 
        totalSolValue: portfolio.totalSolValue,
        totalUsdValue: portfolio.totalUsdValue,
        tokenCount: portfolio.tokens.length
      });
    } catch (error) {
      logger.error('[CACHE] Error updating cache', { error, walletAddress });
      throw error;
    }
  }

  /**
   * Create balance update event for processing
   */
  async createBalanceUpdateEvent(
    walletAddress: string, 
    eventType: 'send' | 'receive' | 'manual_refresh' | 'transaction' | 'external_deposit',
    transactionHash?: string,
    affectedTokens?: string[]
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('balance_update_events')
        .insert({
          wallet_address: walletAddress,
          event_type: eventType,
          transaction_hash: transactionHash,
          affected_tokens: affectedTokens,
          processed: false
        });

      if (error) {
        logger.error('[CACHE] Error creating balance update event', { error, walletAddress });
        throw error;
      }

      logger.info('[CACHE] Created balance update event', { 
        walletAddress, 
        eventType, 
        transactionHash 
      });
    } catch (error) {
      logger.error('[CACHE] Error creating balance update event', { error, walletAddress });
      throw error;
    }
  }

  /**
   * Get token balances from cache
   */
  private async getTokenBalancesFromCache(walletAddress: string): Promise<TokenBalance[]> {
    try {
      const { data, error } = await supabase
        .from('token_balance_cache')
        .select('*')
        .eq('wallet_address', walletAddress)
        .order('usd_equivalent', { ascending: false });

      if (error || !data) {
        logger.warn('[CACHE] No token balances found in cache', { walletAddress, error });
        return [];
      }

      return data.map((token: any) => ({
        mint: token.token_mint,
        symbol: token.token_symbol,
        name: token.token_name,
        accountUnit: token.account_unit,
        uiAmount: token.ui_amount,
        priceUsd: token.price_usd,
        solEquivalent: token.sol_equivalent,
        usdEquivalent: token.usd_equivalent,
        image: token.token_image,
        solscanUrl: token.solscan_url,
        decimals: token.decimals
      }));
    } catch (error) {
      logger.error('[CACHE] Error getting token balances from cache', { error, walletAddress });
      return [];
    }
  }

  /**
   * Fetch portfolio from Helius API
   */
  private async fetchFromHelius(walletAddress: string): Promise<WalletPortfolio | null> {
    try {
      // Import Helius service dynamically to avoid circular dependencies
      const { heliusBalanceService } = await import('./HeliusBalanceService');
      const portfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);
      
      // Update cache with fresh data
      await this.updateCache(walletAddress, portfolio);
      
      return portfolio;
    } catch (error) {
      logger.error('[CACHE] Error fetching from Helius', { error, walletAddress });
      return null;
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(lastUpdated: string): boolean {
    const lastUpdateTime = new Date(lastUpdated).getTime();
    const now = Date.now();
    const cacheAgeMinutes = (now - lastUpdateTime) / (1000 * 60);
    
    return cacheAgeMinutes < this.cacheValidityMinutes;
  }

  /**
   * Clear cache for a specific wallet
   */
  async clearCache(walletAddress: string): Promise<void> {
    try {
      // Clear wallet totals
      await supabase
        .from('wallet_balance_cache')
        .delete()
        .eq('wallet_address', walletAddress);

      // Clear token balances
      await supabase
        .from('token_balance_cache')
        .delete()
        .eq('wallet_address', walletAddress);

      logger.info('[CACHE] Cleared cache for wallet', { walletAddress });
    } catch (error) {
      logger.error('[CACHE] Error clearing cache', { error, walletAddress });
      throw error;
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalWallets: number;
    totalTokens: number;
    oldestCache: string | null;
    newestCache: string | null;
  }> {
    try {
      // Get wallet cache stats
      const { data: walletStats } = await supabase
        .from('wallet_balance_cache')
        .select('last_updated')
        .order('last_updated', { ascending: true });

      // Get token cache stats
      const { count: tokenCount } = await supabase
        .from('token_balance_cache')
        .select('*', { count: 'exact', head: true });

      return {
        totalWallets: walletStats?.length || 0,
        totalTokens: tokenCount || 0,
        oldestCache: walletStats?.[0]?.last_updated || null,
        newestCache: walletStats?.[walletStats.length - 1]?.last_updated || null
      };
    } catch (error) {
      logger.error('[CACHE] Error getting cache stats', { error });
      return {
        totalWallets: 0,
        totalTokens: 0,
        oldestCache: null,
        newestCache: null
      };
    }
  }
}

export const balanceCacheService = new BalanceCacheService();
