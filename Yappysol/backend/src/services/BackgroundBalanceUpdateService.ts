import { logger } from '../utils/logger';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { heliusBalanceService } from '../services/HeliusBalanceService';
import { balanceCacheService } from '../services/BalanceCacheService';

export class BackgroundBalanceUpdateService {
  private intervalId: NodeJS.Timeout | null = null;
  private isRunning = false;
  private updateIntervalMs = 30000; // 30 seconds

  constructor() {
    // Allow configuration via environment variable
    const intervalEnv = process.env.BACKGROUND_UPDATE_INTERVAL_MS;
    if (intervalEnv) {
      this.updateIntervalMs = parseInt(intervalEnv, 10);
    }
  }

  /**
   * Start the background update service
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('[BACKGROUND] Service already running');
      return;
    }

    logger.info('[BACKGROUND] Starting background balance update service', {
      intervalMs: this.updateIntervalMs
    });

    this.isRunning = true;
    
    // Run immediately on start
    this.performBatchUpdate();
    
    // Then run on interval
    this.intervalId = setInterval(() => {
      this.performBatchUpdate();
    }, this.updateIntervalMs);
  }

  /**
   * Stop the background update service
   */
  stop(): void {
    if (!this.isRunning) {
      logger.warn('[BACKGROUND] Service not running');
      return;
    }

    logger.info('[BACKGROUND] Stopping background balance update service');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.isRunning = false;
  }

  /**
   * Perform batch update of all wallets
   */
  private async performBatchUpdate(): Promise<void> {
    try {
      const startTime = Date.now();
      logger.info('[BACKGROUND] Starting batch update');

      // Get all active wallet addresses
      const { supabase } = await import('../lib/supabase');
      
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('public_key, user_id')
        .eq('is_active', true);

      if (error || !wallets) {
        logger.error('[BACKGROUND] Error fetching wallets', { error });
        return;
      }

      const walletAddresses = wallets.map((w: any) => w.public_key);
      const portfolios = new Map();
      let successCount = 0;
      let errorCount = 0;

      logger.info('[BACKGROUND] Updating portfolios', { 
        walletCount: walletAddresses.length 
      });

      // Update portfolios in parallel with controlled concurrency
      const updatePromises = walletAddresses.map(async (walletAddress: string) => {
        try {
          const portfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);
          portfolios.set(walletAddress, portfolio);
          
          await balanceCacheService.updateCache(walletAddress, portfolio);
          successCount++;
          
          logger.debug('[BACKGROUND] Updated wallet', { 
            walletAddress,
            totalSolValue: portfolio.totalSolValue,
            totalUsdValue: portfolio.totalUsdValue
          });
        } catch (error: any) {
          errorCount++;
          logger.error('[BACKGROUND] Error updating wallet', { 
            walletAddress, 
            error: error.message 
          });
        }
      });

      await Promise.all(updatePromises);

      // Check for external transactions after portfolio updates
      try {
        logger.info('[BACKGROUND] Checking for external transactions');
        
        const notifications = await externalTransactionService.checkAllWalletsForExternalDeposits();
        
        if (notifications.length > 0) {
          logger.info(`[BACKGROUND] Found ${notifications.length} external transaction notifications`);
          
          for (const notification of notifications) {
            await externalTransactionService.storeExternalTransaction(
              notification.transaction, 
              notification.userId
            );
          }
        }
      } catch (error) {
        logger.error('[BACKGROUND] Error checking external transactions:', error);
      }

      const duration = Date.now() - startTime;
      logger.info(`[BACKGROUND] Batch update completed`, {
        duration,
        totalWallets: walletAddresses.length,
        successCount,
        errorCount,
        portfoliosUpdated: portfolios.size,
        externalTransactionsFound: 0 // This would be updated by the external transaction check
      });

    } catch (error) {
      logger.error('[BACKGROUND] Error in batch update:', error);
    }
  }

  /**
   * Force an immediate update
   */
  async forceUpdate(): Promise<void> {
    logger.info('[BACKGROUND] Force update requested');
    await this.performBatchUpdate();
  }

  /**
   * Update a specific wallet
   */
  async updateWallet(walletAddress: string): Promise<void> {
    try {
      logger.info('[BACKGROUND] Updating specific wallet', { walletAddress });

      const portfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);
      await balanceCacheService.updateCache(walletAddress, portfolio);

      logger.info('[BACKGROUND] Wallet updated successfully', {
        walletAddress,
        totalSolValue: portfolio.totalSolValue,
        totalUsdValue: portfolio.totalUsdValue
      });
    } catch (error) {
      logger.error('[BACKGROUND] Error updating specific wallet', { 
        walletAddress, 
        error 
      });
      throw error;
    }
  }

  /**
   * Get service status
   */
  getStatus(): {
    isRunning: boolean;
    updateIntervalMs: number;
    nextUpdateIn?: number;
  } {
    return {
      isRunning: this.isRunning,
      updateIntervalMs: this.updateIntervalMs,
      nextUpdateIn: this.intervalId ? this.updateIntervalMs : undefined
    };
  }

  /**
   * Update the update interval
   */
  setUpdateInterval(intervalMs: number): void {
    if (intervalMs < 10000) { // Minimum 10 seconds
      logger.warn('[BACKGROUND] Update interval too short, using minimum of 10 seconds');
      intervalMs = 10000;
    }

    this.updateIntervalMs = intervalMs;
    
    if (this.isRunning) {
      logger.info('[BACKGROUND] Restarting service with new interval', { intervalMs });
      this.stop();
      this.start();
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<any> {
    try {
      return await balanceCacheService.getCacheStats();
    } catch (error) {
      logger.error('[BACKGROUND] Error getting cache stats', { error });
      return null;
    }
  }
}

export const backgroundBalanceUpdateService = new BackgroundBalanceUpdateService();
