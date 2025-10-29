import { logger } from '../utils/logger';
import { supabase, TABLES } from '../lib/supabase';

export interface Transaction {
  signature: string;
  walletAddress: string;
  type: 'debit' | 'credit';
  amount: number;
  tokenMint: string;
  tokenSymbol: string;
  blockTime: number;
  slot: number;
}

export class TransactionBasedBalanceTracker {
  /**
   * Initialize balance from blockchain on login
   * This gets ALL tokens (SOL, USDC, BONK, etc.) and stores them
   */
  async initializeBalanceFromBlockchain(walletAddress: string): Promise<void> {
    try {
      logger.info('[BALANCE_TRACKER] Initializing balance from blockchain', { walletAddress });

      // Get current blockchain balance using existing Helius service
      // This fetches ALL tokens: SOL, USDC, BONK, and any other SPL tokens
      const { heliusBalanceService } = await import('../services/HeliusBalanceService');
      const blockchainPortfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);

      // Update database with blockchain balance using existing cache service
      const { balanceCacheService } = await import('../services/BalanceCacheService');
      await balanceCacheService.updateCache(walletAddress, blockchainPortfolio);

      logger.info('[BALANCE_TRACKER] Balance initialized from blockchain', {
        walletAddress,
        totalUsdValue: blockchainPortfolio.totalUsdValue,
        tokenCount: blockchainPortfolio.tokens.length,
        tokens: blockchainPortfolio.tokens.map((t: any) => ({ symbol: t.symbol, amount: t.uiAmount }))
      });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error initializing balance from blockchain', { error, walletAddress });
      throw error;
    }
  }

  /**
   * Handle individual transaction and update balance incrementally
   * This works for ANY SPL token (SOL, USDC, BONK, etc.)
   */
  async handleTransaction(transaction: Transaction): Promise<void> {
    try {
      logger.info('[BALANCE_TRACKER] Processing transaction', {
        signature: transaction.signature,
        walletAddress: transaction.walletAddress,
        type: transaction.type,
        amount: transaction.amount,
        tokenMint: transaction.tokenMint,
        tokenSymbol: transaction.tokenSymbol
      });

      // Check if transaction was already processed
      const { data: existingTx } = await supabase
        .from('transaction_logs')
        .select('signature')
        .eq('signature', transaction.signature)
        .single();

      if (existingTx) {
        logger.info('[BALANCE_TRACKER] Transaction already processed, skipping', {
          signature: transaction.signature
        });
        return;
      }

      // Get current balance from database
      const currentBalance = await this.getCurrentBalance(
        transaction.walletAddress, 
        transaction.tokenMint
      );

      // Calculate new balance
      let newBalance: number;
      if (transaction.type === 'debit') {
        newBalance = Math.max(0, currentBalance - transaction.amount); // Prevent negative balances
      } else if (transaction.type === 'credit') {
        newBalance = currentBalance + transaction.amount;
      } else {
        throw new Error(`Unknown transaction type: ${transaction.type}`);
      }

      // Update database balance
      await this.updateTokenBalance(
        transaction.walletAddress,
        transaction.tokenMint,
        transaction.tokenSymbol,
        newBalance,
        transaction.signature
      );

      // Update wallet totals after balance change
      await this.updateWalletTotals(transaction.walletAddress);

      // Log transaction for audit
      await this.logTransaction(transaction);

      logger.info('[BALANCE_TRACKER] Transaction processed', {
        signature: transaction.signature,
        walletAddress: transaction.walletAddress,
        tokenSymbol: transaction.tokenSymbol,
        oldBalance: currentBalance,
        newBalance: newBalance,
        change: transaction.type === 'debit' ? -transaction.amount : transaction.amount
      });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error processing transaction', { error, transaction });
      // Don't throw - we don't want to break the system if transaction processing fails
    }
  }

  /**
   * Get current balance from database for any token
   */
  private async getCurrentBalance(walletAddress: string, tokenMint: string): Promise<number> {
    try {
      const { data, error } = await supabase
        .from(TABLES.TOKEN_BALANCE_CACHE)
        .select('ui_amount')
        .eq('wallet_address', walletAddress)
        .eq('token_mint', tokenMint)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.ui_amount || 0;
    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error getting current balance', { error, walletAddress, tokenMint });
      return 0;
    }
  }

  /**
   * Update token balance in database for any SPL token
   */
  private async updateTokenBalance(
    walletAddress: string,
    tokenMint: string,
    tokenSymbol: string,
    newBalance: number,
    lastTransactionSignature: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();

      // Get token metadata if not exists
      const tokenMetadata = await this.getTokenMetadata(tokenMint, tokenSymbol);

      await supabase
        .from(TABLES.TOKEN_BALANCE_CACHE)
        .upsert({
          wallet_address: walletAddress,
          token_mint: tokenMint,
          token_symbol: tokenSymbol,
          token_name: tokenMetadata.name,
          account_unit: tokenMint,
          ui_amount: newBalance,
          price_usd: tokenMetadata.priceUsd || 0,
          sol_equivalent: 0, // Will be calculated
          usd_equivalent: newBalance * (tokenMetadata.priceUsd || 0),
          token_image: tokenMetadata.image,
          solscan_url: `https://solscan.io/token/${tokenMint}`,
          decimals: tokenMetadata.decimals || 9,
          last_updated: now,
          last_transaction_signature: lastTransactionSignature
        }, { onConflict: 'wallet_address,token_mint' });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error updating token balance', { error, walletAddress, tokenMint });
      throw error;
    }
  }

  /**
   * Get token metadata (price, decimals, etc.)
   * Priority: token_launches table → TokenMetadataService → Moralis
   */
  private async getTokenMetadata(tokenMint: string, tokenSymbol: string): Promise<any> {
    try {
      // First, check if this is a token we launched (check token_launches table)
      const { data: launchData, error: launchError } = await supabase
        .from('token_launches')
        .select('token_name, token_symbol, image_url, description')
        .eq('mint_address', tokenMint)
        .single();

      if (!launchError && launchData) {
        logger.info('[BALANCE_TRACKER] Found token in token_launches table', { 
          tokenMint, 
          name: launchData.token_name,
          hasImage: !!launchData.image_url
        });

        // Get price from Moralis API
        const { getMoralis } = await import('../lib/moralis');
        let price = 0;
        try {
          const moralis = getMoralis();
          const priceResponse = await moralis.SolApi.token.getTokenPrice({
            network: 'mainnet',
            address: tokenMint
          });
          price = priceResponse?.raw?.usdPrice || 0;
        } catch (priceError) {
          logger.debug('[BALANCE_TRACKER] Could not get price for launched token from Moralis');
        }

        return {
          name: launchData.token_name || tokenSymbol,
          priceUsd: price,
          decimals: 9,
          image: launchData.image_url || null
        };
      }

      // Try TokenMetadataService (covers known tokens)
      const { TokenMetadataService } = await import('./TokenMetadataService');
      const knownMetadata = TokenMetadataService.getMetadata(tokenMint);
      if (knownMetadata) {
        logger.info('[BALANCE_TRACKER] Found token in TokenMetadataService', { tokenMint, symbol: knownMetadata.symbol });
        
        // Get price from Moralis
        const { getMoralis } = await import('../lib/moralis');
        let price = 0;
        try {
          const moralis = getMoralis();
          const priceResponse = await moralis.SolApi.token.getTokenPrice({
            network: 'mainnet',
            address: tokenMint
          });
          price = priceResponse?.raw?.usdPrice || TokenMetadataService.getStablecoinPrice(tokenMint);
        } catch (priceError) {
          logger.debug('[BALANCE_TRACKER] Could not get price from Moralis');
        }

        return {
          name: knownMetadata.name || tokenSymbol,
          priceUsd: price,
          decimals: knownMetadata.decimals || 9,
          image: knownMetadata.image || null
        };
      }

      // Fallback to Moralis for price (unknown token)
      const { getMoralis } = await import('../lib/moralis');
      let price = 0;
      try {
        const moralis = getMoralis();
        const priceResponse = await moralis.SolApi.token.getTokenPrice({
          network: 'mainnet',
          address: tokenMint
        });
        price = priceResponse?.raw?.usdPrice || 0;
      } catch (priceError) {
        logger.debug('[BALANCE_TRACKER] Could not get price from Moralis for unknown token');
      }

      return {
        name: tokenSymbol,
        priceUsd: price,
        decimals: 9,
        image: null
      };
    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error getting token metadata', { error, tokenMint });
      return {
        name: tokenSymbol,
        priceUsd: 0,
        decimals: 9,
        image: null
      };
    }
  }

  /**
   * Update wallet totals after transaction
   */
  private async updateWalletTotals(walletAddress: string): Promise<void> {
    try {
      // Get all token balances for this wallet
      const { data: tokens, error } = await supabase
        .from(TABLES.TOKEN_BALANCE_CACHE)
        .select('usd_equivalent, sol_equivalent')
        .eq('wallet_address', walletAddress);

      if (error) {
        logger.error('[BALANCE_TRACKER] Error getting tokens for wallet totals', { error, walletAddress });
        return;
      }

      // Calculate totals
      const totalUsdValue = tokens?.reduce((sum: number, token: any) => sum + (token.usd_equivalent || 0), 0) || 0;
      const totalSolValue = tokens?.reduce((sum: number, token: any) => sum + (token.sol_equivalent || 0), 0) || 0;

      // Update wallet totals
      const now = new Date().toISOString();
      await supabase
        .from(TABLES.WALLET_BALANCE_CACHE)
        .upsert({
          wallet_address: walletAddress,
          total_sol_value: totalSolValue,
          total_usd_value: totalUsdValue,
          last_updated: now
        }, { onConflict: 'wallet_address' });

      logger.info('[BALANCE_TRACKER] Updated wallet totals', {
        walletAddress,
        totalSolValue,
        totalUsdValue
      });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error updating wallet totals', { error, walletAddress });
    }
  }

  /**
   * Log transaction for audit trail
   */
  private async logTransaction(transaction: Transaction): Promise<void> {
    try {
      await supabase
        .from('transaction_logs')
        .insert({
          signature: transaction.signature,
          wallet_address: transaction.walletAddress,
          transaction_type: transaction.type,
          amount: transaction.amount,
          token_mint: transaction.tokenMint,
          token_symbol: transaction.tokenSymbol,
          block_time: transaction.blockTime,
          slot: transaction.slot,
          processed_at: new Date().toISOString()
        });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error logging transaction', { error, transaction });
      // Don't throw - logging failure shouldn't break transaction processing
    }
  }

  /**
   * Handle multiple tokens in a single transaction (e.g., swaps)
   */
  async handleMultiTokenTransaction(transactions: Transaction[]): Promise<void> {
    try {
      logger.info('[BALANCE_TRACKER] Processing multi-token transaction', {
        transactionCount: transactions.length,
        signatures: transactions.map(t => t.signature)
      });

      // Process each token in the transaction
      for (const transaction of transactions) {
        await this.handleTransaction(transaction);
      }

      logger.info('[BALANCE_TRACKER] Multi-token transaction processed', {
        transactionCount: transactions.length
      });

    } catch (error) {
      logger.error('[BALANCE_TRACKER] Error processing multi-token transaction', { error, transactions });
    }
  }
}

export const transactionBasedBalanceTracker = new TransactionBasedBalanceTracker(); 