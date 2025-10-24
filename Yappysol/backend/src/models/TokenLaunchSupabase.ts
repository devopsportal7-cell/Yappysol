import { v4 as uuidv4 } from 'uuid';
import { supabase, TABLES } from '../lib/supabase';

export interface TokenLaunch {
  id: string;
  user_id: string;
  session_id?: string;
  
  // Token Details
  token_name: string;
  token_symbol: string;
  description?: string;
  image_url?: string;
  
  // Social Links
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
  
  // Launch Configuration
  pool_type: 'pump' | 'bonk';
  launch_amount: number;
  initial_supply?: number;
  decimals?: number;
  
  // Transaction Details
  mint_address?: string;
  transaction_signature?: string;
  unsigned_transaction?: string;
  
  // Price & Market Data
  current_price_usd?: number;
  market_cap_usd?: number;
  price_change_24h?: number;
  volume_24h_usd?: number;
  liquidity_usd?: number;
  holders_count?: number;
  
  // Status Tracking
  status: 'draft' | 'pending' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
  last_price_update?: string;
}

export interface TokenPrice {
  id: string;
  token_launch_id: string;
  mint_address: string;
  price_usd: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  liquidity_usd: number;
  holders_count: number;
  price_change_24h: number;
  recorded_at: string;
}

export interface UserTokenHolding {
  id: string;
  user_id: string;
  token_launch_id?: string;
  mint_address: string;
  balance: number;
  balance_usd: number;
  first_acquired_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
}

export interface CreateTokenLaunchData {
  userId: string;
  sessionId?: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  imageUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  poolType: 'pump' | 'bonk';
  launchAmount: number;
  initialSupply?: number;
  decimals?: number;
}

export interface UpdateTokenLaunchData {
  description?: string;
  imageUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  launchAmount?: number;
  initialSupply?: number;
  decimals?: number;
  mintAddress?: string;
  transactionSignature?: string;
  unsignedTransaction?: string;
  status?: 'draft' | 'pending' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
  currentPriceUsd?: number;
  marketCapUsd?: number;
  priceChange24h?: number;
  volume24hUsd?: number;
  liquidityUsd?: number;
  holdersCount?: number;
}

export interface LaunchStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalValueUsd: number;
  averagePriceUsd: number;
  bestPerformer?: TokenLaunch;
  worstPerformer?: TokenLaunch;
}

export class TokenLaunchModel {
  static async createLaunch(data: CreateTokenLaunchData): Promise<TokenLaunch> {
    const id = uuidv4();
    const launch: TokenLaunch = {
      id,
      user_id: data.userId,
      session_id: data.sessionId,
      token_name: data.tokenName,
      token_symbol: data.tokenSymbol,
      description: data.description,
      image_url: data.imageUrl,
      twitter_url: data.twitterUrl,
      telegram_url: data.telegramUrl,
      website_url: data.websiteUrl,
      pool_type: data.poolType,
      launch_amount: data.launchAmount,
      initial_supply: data.initialSupply,
      decimals: data.decimals || 9,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdLaunch, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .insert([launch])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create token launch: ${error.message}`);
    }

    return createdLaunch;
  }

  static async findByUserId(userId: string, limit?: number): Promise<TokenLaunch[]> {
    let query = supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find token launches: ${error.message}`);
    }

    return data || [];
  }

  static async findById(id: string): Promise<TokenLaunch | null> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find token launch: ${error.message}`);
    }

    return data;
  }

  static async findByMintAddress(mintAddress: string): Promise<TokenLaunch | null> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('mint_address', mintAddress)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find token launch by mint: ${error.message}`);
    }

    return data;
  }

  static async updateLaunch(id: string, updates: UpdateTokenLaunchData): Promise<TokenLaunch | null> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.status === 'completed' && { completed_at: new Date().toISOString() }),
      ...(updates.currentPriceUsd && { last_price_update: new Date().toISOString() })
    };

    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update token launch: ${error.message}`);
    }

    return data;
  }

  static async deleteLaunch(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete token launch: ${error.message}`);
    }

    return true;
  }

  static async getLaunchStats(userId: string): Promise<LaunchStats> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('status, current_price_usd, market_cap_usd, price_change_24h, token_name, token_symbol')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get launch stats: ${error.message}`);
    }

    const launches = data || [];
    const completed = launches.filter((l: TokenLaunch) => l.status === 'completed');
    
    const stats: LaunchStats = {
      total: launches.length,
      completed: completed.length,
      failed: launches.filter((l: TokenLaunch) => l.status === 'failed').length,
      pending: launches.filter((l: TokenLaunch) => l.status === 'pending').length,
      totalValueUsd: completed.reduce((sum: number, l: TokenLaunch) => sum + (l.market_cap_usd || 0), 0),
      averagePriceUsd: completed.length > 0 
        ? completed.reduce((sum: number, l: TokenLaunch) => sum + (l.current_price_usd || 0), 0) / completed.length 
        : 0
    };

    // Find best and worst performers
    const performers = completed.filter((l: TokenLaunch) => l.price_change_24h !== null);
    if (performers.length > 0) {
      stats.bestPerformer = performers.reduce((best: TokenLaunch, current: TokenLaunch) => 
        (current.price_change_24h || 0) > (best.price_change_24h || 0) ? current : best
      );
      stats.worstPerformer = performers.reduce((worst: TokenLaunch, current: TokenLaunch) => 
        (current.price_change_24h || 0) < (worst.price_change_24h || 0) ? current : worst
      );
    }

    return stats;
  }

  static async getTopPerformers(userId: string, limit: number = 5): Promise<TokenLaunch[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'completed')
      .not('price_change_24h', 'is', null)
      .order('price_change_24h', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get top performers: ${error.message}`);
    }

    return data || [];
  }

  static async getRecentLaunches(userId: string, limit: number = 10): Promise<TokenLaunch[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent launches: ${error.message}`);
    }

    return data || [];
  }

  // Price tracking methods
  static async addPriceRecord(launchId: string, mintAddress: string, priceData: {
    priceUsd: number;
    marketCapUsd: number;
    volume24hUsd: number;
    liquidityUsd: number;
    holdersCount: number;
    priceChange24h: number;
  }): Promise<TokenPrice> {
    const priceRecord: TokenPrice = {
      id: uuidv4(),
      token_launch_id: launchId,
      mint_address: mintAddress,
      price_usd: priceData.priceUsd,
      market_cap_usd: priceData.marketCapUsd,
      volume_24h_usd: priceData.volume24hUsd,
      liquidity_usd: priceData.liquidityUsd,
      holders_count: priceData.holdersCount,
      price_change_24h: priceData.priceChange24h,
      recorded_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.TOKEN_PRICES)
      .insert([priceRecord])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add price record: ${error.message}`);
    }

    return data;
  }

  static async getPriceHistory(launchId: string, days: number = 7): Promise<TokenPrice[]> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from(TABLES.TOKEN_PRICES)
      .select('*')
      .eq('token_launch_id', launchId)
      .gte('recorded_at', startDate.toISOString())
      .order('recorded_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get price history: ${error.message}`);
    }

    return data || [];
  }

  // Portfolio integration methods
  static async getUserHoldings(userId: string): Promise<UserTokenHolding[]> {
    const { data, error } = await supabase
      .from(TABLES.USER_TOKEN_HOLDINGS)
      .select(`
        *,
        token_launches (
          token_name,
          token_symbol,
          image_url,
          current_price_usd,
          market_cap_usd,
          price_change_24h
        )
      `)
      .eq('user_id', userId)
      .gt('balance', 0)
      .order('balance_usd', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user holdings: ${error.message}`);
    }

    return data || [];
  }

  static async updateUserHolding(userId: string, mintAddress: string, balance: number, balanceUsd: number): Promise<UserTokenHolding> {
    const { data, error } = await supabase
      .from(TABLES.USER_TOKEN_HOLDINGS)
      .upsert({
        user_id: userId,
        mint_address: mintAddress,
        balance,
        balance_usd: balanceUsd,
        last_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,mint_address'
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user holding: ${error.message}`);
    }

    return data;
  }

  static async getPortfolioValue(userId: string): Promise<{
    totalValueUsd: number;
    totalTokens: number;
    holdings: UserTokenHolding[];
  }> {
    const holdings = await this.getUserHoldings(userId);
    
    return {
      totalValueUsd: holdings.reduce((sum, h) => sum + h.balance_usd, 0),
      totalTokens: holdings.length,
      holdings
    };
  }
}
