import { supabase } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface SwapTransactionRecord {
  user_id: string;
  wallet_id: string;
  from_token_mint: string;
  from_token_symbol?: string;
  from_token_amount: number;
  to_token_mint: string;
  to_token_symbol?: string;
  to_token_amount?: number;
  transaction_signature: string;
  solscan_url?: string;
  execution_provider: 'pumpportal' | 'jupiter' | 'pump' | 'bonk' | 'raydium';
  slippage_bps?: number;
  priority_fee?: number;
  status?: 'pending' | 'confirmed' | 'failed' | 'reverted';
  block_time?: Date;
  fee_amount?: number;
  notes?: string;
}

export class SwapTrackingService {
  /**
   * Record a swap transaction in the database
   */
  async recordSwap(swapData: SwapTransactionRecord): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('swap_transactions')
        .insert({
          user_id: swapData.user_id,
          wallet_id: swapData.wallet_id,
          from_token_mint: swapData.from_token_mint,
          from_token_symbol: swapData.from_token_symbol,
          from_token_amount: swapData.from_token_amount,
          to_token_mint: swapData.to_token_mint,
          to_token_symbol: swapData.to_token_symbol,
          to_token_amount: swapData.to_token_amount,
          transaction_signature: swapData.transaction_signature,
          solscan_url: swapData.solscan_url || `https://solscan.io/tx/${swapData.transaction_signature}`,
          execution_provider: swapData.execution_provider,
          slippage_bps: swapData.slippage_bps || 50,
          priority_fee: swapData.priority_fee,
          status: swapData.status || 'pending',
          block_time: swapData.block_time,
          fee_amount: swapData.fee_amount,
          notes: swapData.notes
        })
        .select('id')
        .single();

      if (error) {
        logger.error('[SwapTrackingService] Error recording swap:', error);
        throw error;
      }

      logger.info('[SwapTrackingService] Swap transaction recorded:', {
        swapId: data.id,
        signature: swapData.transaction_signature,
        userId: swapData.user_id
      });

      return data.id;
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to record swap:', error);
      throw error;
    }
  }

  /**
   * Update swap transaction status
   */
  async updateSwapStatus(
    signature: string,
    status: 'confirmed' | 'failed' | 'reverted',
    blockTime?: Date,
    feeAmount?: number,
    toTokenAmount?: number
  ): Promise<void> {
    try {
      const updates: any = { status, updated_at: new Date() };

      if (status === 'confirmed') {
        updates.confirmed_at = new Date();
        if (blockTime) updates.block_time = blockTime;
        if (feeAmount) updates.fee_amount = feeAmount;
        if (toTokenAmount) updates.to_token_amount = toTokenAmount;
      }

      const { error } = await supabase
        .from('swap_transactions')
        .update(updates)
        .eq('transaction_signature', signature);

      if (error) {
        logger.error('[SwapTrackingService] Error updating swap status:', error);
        throw error;
      }

      logger.info('[SwapTrackingService] Swap status updated:', {
        signature,
        status,
        blockTime,
        feeAmount
      });
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to update swap status:', error);
      throw error;
    }
  }

  /**
   * Get user's swap history
   */
  async getUserSwapHistory(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('swap_transactions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit)
        .range(offset, offset + limit - 1);

      if (error) {
        logger.error('[SwapTrackingService] Error fetching swap history:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to fetch swap history:', error);
      throw error;
    }
  }

  /**
   * Get swap transaction by signature
   */
  async getSwapBySignature(signature: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('swap_transactions')
        .select('*')
        .eq('transaction_signature', signature)
        .single();

      if (error) {
        logger.error('[SwapTrackingService] Error fetching swap:', error);
        throw error;
      }

      return data;
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to fetch swap:', error);
      throw error;
    }
  }

  /**
   * Get swap analytics for a user
   */
  async getUserSwapAnalytics(userId: string): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('swap_analytics')
        .select('*')
        .eq('user_id', userId)
        .order('swap_date', { ascending: false });

      if (error) {
        logger.error('[SwapTrackingService] Error fetching swap analytics:', error);
        throw error;
      }

      return data || [];
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to fetch swap analytics:', error);
      throw error;
    }
  }

  /**
   * Get total volume swapped by a user
   */
  async getUserTotalVolume(userId: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('swap_transactions')
        .select('from_token_amount')
        .eq('user_id', userId)
        .eq('status', 'confirmed');

      if (error) {
        logger.error('[SwapTrackingService] Error fetching total volume:', error);
        throw error;
      }

      const totalVolume = data?.reduce((sum: number, tx: any) => sum + Number(tx.from_token_amount), 0) || 0;
      return totalVolume;
    } catch (error: any) {
      logger.error('[SwapTrackingService] Failed to calculate total volume:', error);
      throw error;
    }
  }
}

export const swapTrackingService = new SwapTrackingService();

