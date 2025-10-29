import { supabase, TABLES } from '../lib/supabase';
import { logger } from '../utils/logger';

export interface ExternalTransaction {
  signature: string;
  blockTime: number;
  amount: number;
  tokenMint: string;
  tokenSymbol: string;
  tokenName?: string;
  sender: string;
  recipient: string;
  type: 'SOL' | 'SPL';
  valueUsd?: number;
  solscanUrl: string;
}

export interface HeliusTransaction {
  signature: string;
  blockTime: number;
  slot: number;
  confirmationStatus: string;
  err: any;
  memo: string | null;
  fee: number;
  accounts: string[];
  preBalances: number[];
  postBalances: number[];
  preTokenBalances: any[];
  postTokenBalances: any[];
  logs: string[];
  innerInstructions: any[];
}

export class ExternalTransactionService {
  private platformWallets: string[] = [];
  private heliusApiKey: string;
  private heliusBaseUrl: string;

  constructor() {
    this.heliusApiKey = process.env.HELIUS_API_KEY || '';
    this.heliusBaseUrl = process.env.HELIUS_BASE_URL || 'https://api.helius.xyz';
    
    if (!this.heliusApiKey) {
      logger.warn('[EXTERNAL_TX] HELIUS_API_KEY not configured');
    }
  }

  /**
   * Load platform wallets to filter out internal transactions
   */
  async loadPlatformWallets(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('platform_wallets')
        .select('wallet_address')
        .eq('is_active', true);

      if (error) {
        logger.error('[EXTERNAL_TX] Error loading platform wallets', { error });
        return;
      }

      this.platformWallets = (data || []).map((w: any) => w.wallet_address);
      logger.info(`[EXTERNAL_TX] Loaded ${this.platformWallets.length} platform wallets`);
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error loading platform wallets', { error });
    }
  }

  /**
   * Check for new external deposits for a specific wallet
   */
  async checkForExternalDeposits(walletAddress: string): Promise<ExternalTransaction[]> {
    try {
      logger.info(`[EXTERNAL_TX] Checking for external deposits for wallet: ${walletAddress}`);
      
      // Load platform wallets if not already loaded
      if (this.platformWallets.length === 0) {
        await this.loadPlatformWallets();
      }

      // Get recent transactions from Helius
      const transactions = await this.getRecentTransactions(walletAddress);
      logger.info(`[EXTERNAL_TX] Fetched ${transactions.length} total transactions from Helius`);
      
      if (transactions.length === 0) {
        logger.warn(`[EXTERNAL_TX] No transactions returned from Helius for wallet: ${walletAddress}`);
        return [];
      }
      
      // Filter for incoming AND outgoing transactions where wallet is involved
      const relevantTxs = transactions.filter(tx => {
        const isIncoming = this.isIncomingTransaction(tx, walletAddress);
        const isOutgoing = this.isOutgoingTransaction(tx, walletAddress);
        const isFinalized = tx.confirmationStatus === 'finalized';
        const hasNoError = !tx.err;
        
        const isRelevant = (isIncoming || isOutgoing) && isFinalized && hasNoError;
        
        if (!isRelevant) {
          logger.debug(`[EXTERNAL_TX] Transaction ${tx.signature} filtered out`, {
            isIncoming,
            isOutgoing,
            isFinalized,
            hasNoError
          });
        }
        
        return isRelevant;
      });

      logger.info(`[EXTERNAL_TX] Found ${relevantTxs.length} relevant transactions (incoming or outgoing)`);

      // Filter for external transactions (not from platform wallets)
      const externalTxs = relevantTxs.filter(tx => {
        const isExternal = this.isExternalTransaction(tx);
        if (!isExternal) {
          logger.debug(`[EXTERNAL_TX] Transaction ${tx.signature} filtered out - internal transaction`);
        }
        return isExternal;
      });

      logger.info(`[EXTERNAL_TX] Found ${externalTxs.length} external transactions`);

      // Convert to our format and deduplicate by signature
      const externalTransactions: ExternalTransaction[] = [];
      for (const tx of externalTxs) {
        const exists = await this.checkTransactionExists(tx.signature);
        if (!exists) {
          logger.info(`[EXTERNAL_TX] New external transaction found: ${tx.signature}`);
          const externalTx = await this.convertToExternalTransaction(tx, walletAddress);
          if (externalTx) {
            externalTransactions.push(externalTx);
          } else {
            logger.warn(`[EXTERNAL_TX] Failed to convert transaction ${tx.signature}`);
          }
        } else {
          logger.debug(`[EXTERNAL_TX] Transaction ${tx.signature} already exists in database`);
        }
      }

      if (externalTransactions.length > 0) {
        logger.info(`[EXTERNAL_TX] Found ${externalTransactions.length} new external transactions for ${walletAddress}`);
      } else {
        logger.info(`[EXTERNAL_TX] No new external transactions for ${walletAddress}`);
      }

      return externalTransactions;
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error checking external deposits', { error, walletAddress });
      return [];
    }
  }

  /**
   * Check for external deposits across all user wallets
   */
  async checkAllWalletsForExternalDeposits(): Promise<Array<{ transaction: ExternalTransaction; userId: string }>> {
    try {
      // Get all active user wallets
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('user_id, public_key');

      if (error || !wallets) {
        logger.error('[EXTERNAL_TX] Error fetching user wallets', { error });
        return [];
      }

      const notifications: Array<{ transaction: ExternalTransaction; userId: string }> = [];

      // Check each wallet for external deposits
      for (const wallet of wallets) {
        try {
          const externalTxs = await this.checkForExternalDeposits(wallet.public_key);
          
          for (const tx of externalTxs) {
            notifications.push({
              transaction: tx,
              userId: wallet.user_id
            });
          }
        } catch (error) {
          logger.error('[EXTERNAL_TX] Error checking wallet', { 
            error, 
            walletAddress: wallet.public_key 
          });
        }
      }

      return notifications;
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error checking all wallets', { error });
      return [];
    }
  }

  /**
   * Store external transaction from webhook
   * New simplified method that doesn't require API polling
   */
  async storeWebhookTransaction(
    transaction: ExternalTransaction,
    userId: string
  ): Promise<void> {
    try {
      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('external_transactions')
        .upsert({
          user_id: userId,
          signature: transaction.signature,
          block_time: transaction.blockTime,
          amount: transaction.amount,
          token_mint: transaction.tokenMint,
          token_symbol: transaction.tokenSymbol,
          token_name: transaction.tokenName,
          sender: transaction.sender,
          recipient: transaction.recipient,
          type: transaction.type,
          value_usd: transaction.valueUsd,
          solscan_url: transaction.solscanUrl,
          created_at: now,
          updated_at: now
        }, { onConflict: 'signature' });

      if (error) {
        logger.error('[EXTERNAL_TX] Error storing webhook transaction', { error, transaction });
        return;
      }

      logger.info('[EXTERNAL_TX] Stored webhook transaction', {
        signature: transaction.signature,
        userId,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
      });

      // Trigger balance update for recipient wallet
      if (transaction.recipient) {
        const { requestWalletRefresh } = await import('../lib/portfolio-refresh');
        requestWalletRefresh(transaction.recipient, true);

        // Emit SSE event for instant UI update
        const { emitWalletUpdated } = await import('../lib/events');
        emitWalletUpdated(transaction.recipient, 'external_tx', {
          transactionHash: transaction.signature,
          amount: transaction.amount,
          tokenSymbol: transaction.tokenSymbol,
          valueUsd: transaction.valueUsd
        });
      }
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error storing webhook transaction', { error, transaction });
    }
  }

  /**
   * Store external transaction and trigger balance update
   */
  async storeExternalTransaction(
    transaction: ExternalTransaction, 
    userId: string,
    notificationReceivedTimestamp?: number
  ): Promise<void> {
    try {
      // Verify user exists before storing transaction
      const { data: userExists } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .single();

      if (!userExists) {
        logger.error('[EXTERNAL_TX] Cannot store transaction - user_id does not exist in users table', { 
          userId,
          signature: transaction.signature,
          recipient: transaction.recipient
        });
        return;
      }

      const now = new Date().toISOString();
      
      const { error } = await supabase
        .from('external_transactions')
        .upsert({
          user_id: userId,
          signature: transaction.signature,
          block_time: transaction.blockTime,
          amount: transaction.amount,
          token_mint: transaction.tokenMint,
          token_symbol: transaction.tokenSymbol,
          token_name: transaction.tokenName,
          sender: transaction.sender,
          recipient: transaction.recipient,
          type: transaction.type,
          value_usd: transaction.valueUsd,
          solscan_url: transaction.solscanUrl,
          created_at: now,
          updated_at: now
        }, { onConflict: 'signature' });

      if (error) {
        logger.error('[EXTERNAL_TX] Error storing external transaction', { error, transaction });
        return;
      }

      logger.info('[EXTERNAL_TX] Stored external transaction', {
        signature: transaction.signature,
        userId,
        amount: transaction.amount,
        tokenSymbol: transaction.tokenSymbol,
        detectionTimeMs: notificationReceivedTimestamp ? Date.now() - notificationReceivedTimestamp : undefined
      });

      // Trigger balance update for recipient wallet
      if (transaction.recipient) {
        const { requestWalletRefresh } = await import('../lib/portfolio-refresh');
        requestWalletRefresh(transaction.recipient, true); // Immediate refresh

        // Emit SSE event for instant UI update
        const { emitWalletUpdated } = await import('../lib/events');
        emitWalletUpdated(transaction.recipient, 'external_tx', {
          transactionHash: transaction.signature,
          amount: transaction.amount,
          tokenSymbol: transaction.tokenSymbol,
          valueUsd: transaction.valueUsd
        });
      }
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error storing external transaction', { error, transaction });
    }
  }

  /**
   * Get user ID by wallet address
   */
  async getUserIdByWallet(walletAddress: string): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('wallets')
        .select('user_id')
        .eq('public_key', walletAddress)
        .single();

      if (error || !data) {
        logger.warn('[EXTERNAL_TX] Wallet not found', { walletAddress, error });
        return null;
      }

      return data.user_id;
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error getting user ID by wallet', { error, walletAddress });
      return null;
    }
  }

  /**
   * Get recent transactions from Helius API
   */
  private async getRecentTransactions(walletAddress: string): Promise<HeliusTransaction[]> {
    try {
      logger.info(`[EXTERNAL_TX] Fetching transactions from Helius for wallet: ${walletAddress}`);
      const response = await fetch(`${this.heliusBaseUrl}/v0/addresses/${walletAddress}/transactions?api-key=${this.heliusApiKey}&limit=50`);
      
      logger.info(`[EXTERNAL_TX] Helius API response status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('[EXTERNAL_TX] Helius API error', { 
          status: response.status, 
          statusText: response.statusText,
          errorText,
          walletAddress 
        });
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      logger.info(`[EXTERNAL_TX] Received ${Array.isArray(transactions) ? transactions.length : 0} transactions from Helius`);
      return transactions || [];
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error fetching transactions from Helius', { error, walletAddress });
      return [];
    }
  }

  /**
   * Check if transaction is incoming to the wallet
   */
  private isIncomingTransaction(tx: HeliusTransaction, walletAddress: string): boolean {
    // Check if wallet is in postTokenBalances (for SPL tokens)
    const hasPostTokenBalance = tx.postTokenBalances?.some(balance => 
      balance.owner === walletAddress && balance.uiTokenAmount?.uiAmount > 0
    );

    // Check if wallet received SOL (postBalance > preBalance)
    const walletIndex = tx.accounts.indexOf(walletAddress);
    if (walletIndex !== -1) {
      const preBalance = tx.preBalances[walletIndex] || 0;
      const postBalance = tx.postBalances[walletIndex] || 0;
      const solIncrease = postBalance > preBalance;

      logger.debug('[EXTERNAL_TX] Balance check', {
        walletIndex,
        preBalance,
        postBalance,
        solIncrease,
        hasPostTokenBalance
      });

      return hasPostTokenBalance || solIncrease;
    }

    return hasPostTokenBalance || false;
  }

  /**
   * Check if transaction is outgoing from the wallet
   */
  private isOutgoingTransaction(tx: HeliusTransaction, walletAddress: string): boolean {
    // Check if wallet is in preTokenBalances but decreased (for SPL tokens)
    const tokenDecrease = tx.preTokenBalances?.some(preBalance => {
      if (preBalance.owner === walletAddress && preBalance.uiTokenAmount?.uiAmount) {
        const postBalance = tx.postTokenBalances?.find(post => 
          post.owner === walletAddress && post.mint === preBalance.mint
        );
        const postAmount = postBalance?.uiTokenAmount?.uiAmount || 0;
        const preAmount = preBalance.uiTokenAmount.uiAmount;
        return preAmount > postAmount;
      }
      return false;
    });

    // Check if wallet sent SOL (preBalance > postBalance)
    const walletIndex = tx.accounts.indexOf(walletAddress);
    if (walletIndex !== -1) {
      const preBalance = tx.preBalances[walletIndex] || 0;
      const postBalance = tx.postBalances[walletIndex] || 0;
      const solDecrease = preBalance > postBalance;

      return tokenDecrease || solDecrease;
    }

    return tokenDecrease || false;
  }

  /**
   * Check if transaction is external (not from platform wallets)
   */
  private isExternalTransaction(tx: HeliusTransaction): boolean {
    // Check if any of the transaction accounts are platform wallets
    const hasPlatformWallet = tx.accounts.some(account => 
      this.platformWallets.includes(account)
    );

    return !hasPlatformWallet;
  }

  /**
   * Check if transaction already exists in database
   */
  private async checkTransactionExists(signature: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('external_transactions')
        .select('id')
        .eq('signature', signature)
        .single();

      return !error && !!data;
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert Helius transaction to ExternalTransaction format
   */
  private async convertToExternalTransaction(
    tx: HeliusTransaction, 
    walletAddress: string
  ): Promise<ExternalTransaction | null> {
    try {
      // Determine if this is SOL or SPL token transaction
      const walletIndex = tx.accounts.indexOf(walletAddress);
      const solIncrease = walletIndex !== -1 ? 
        (tx.postBalances[walletIndex] || 0) - (tx.preBalances[walletIndex] || 0) : 0;

      // Check for SPL token transfers
      const tokenTransfer = tx.postTokenBalances?.find(balance => 
        balance.owner === walletAddress && balance.uiTokenAmount?.uiAmount > 0
      );

      if (solIncrease > 0) {
        // SOL transaction
        const amount = solIncrease / 1e9; // Convert lamports to SOL
        
        // Filter out dust transactions (rent exemption refunds, tiny system transactions)
        // Only log transactions with meaningful amounts (>= 0.00001 SOL)
        const MIN_SIGNIFICANT_AMOUNT = 0.00001;
        if (amount < MIN_SIGNIFICANT_AMOUNT) {
          logger.debug(`[EXTERNAL_TX] Skipping dust transaction: ${amount} SOL`);
          return null;
        }
        
        const solscanUrl = `https://solscan.io/tx/${tx.signature}`;

        return {
          signature: tx.signature,
          blockTime: tx.blockTime,
          amount,
          tokenMint: 'So11111111111111111111111111111111111111112', // SOL mint
          tokenSymbol: 'SOL',
          tokenName: 'Solana',
          sender: tx.accounts[0] || 'unknown', // First account is usually the sender
          recipient: walletAddress,
          type: 'SOL',
          solscanUrl
        };
      } else if (tokenTransfer) {
        // SPL token transaction
        const amount = tokenTransfer.uiTokenAmount?.uiAmount || 0;
        const tokenMint = tokenTransfer.mint;
        const solscanUrl = `https://solscan.io/tx/${tx.signature}`;

        // Get token metadata (you might want to cache this)
        const tokenSymbol = await this.getTokenSymbol(tokenMint);

        return {
          signature: tx.signature,
          blockTime: tx.blockTime,
          amount,
          tokenMint,
          tokenSymbol,
          tokenName: tokenSymbol,
          sender: tx.accounts[0] || 'unknown',
          recipient: walletAddress,
          type: 'SPL',
          solscanUrl
        };
      }

      return null;
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error converting transaction', { error, tx });
      return null;
    }
  }

  /**
   * Get token symbol from mint address
   */
  private async getTokenSymbol(tokenMint: string): Promise<string> {
    try {
      // Try to get from cache first
      const { data: cached } = await supabase
        .from('token_balance_cache')
        .select('token_symbol')
        .eq('token_mint', tokenMint)
        .single();

      if (cached?.token_symbol) {
        return cached.token_symbol;
      }

      // Fallback to a simple mapping or API call
      // You might want to implement a more sophisticated token metadata service
      const commonTokens: Record<string, string> = {
        'So11111111111111111111111111111111111111112': 'SOL',
        'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
        'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
        'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
        'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So': 'mSOL',
        '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs': 'ETH',
        'A94X1f3u6T1ErQma7cuSfAs4t2D4xL8fJk1cZ2DQY3VV': 'BTC',
      };

      return commonTokens[tokenMint] || 'UNKNOWN';
    } catch (error) {
      logger.error('[EXTERNAL_TX] Error getting token symbol', { error, tokenMint });
      return 'UNKNOWN';
    }
  }
}

export const externalTransactionService = new ExternalTransactionService();
