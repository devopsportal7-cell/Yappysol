import PQueue from "p-queue";
import { logger } from '../utils/logger';

const perWalletTimers = new Map<string, NodeJS.Timeout>();
const inFlight = new Map<string, Promise<void>>();
const globalQueue = new PQueue({ concurrency: 6 });

const DEBOUNCE_MS = 800;
const IMMEDIATE_REFRESH_MS = 5000; // 5 seconds to allow Helius to propagate transaction
const RETRY_DELAY_MS = 5000; // 5 seconds between retries if balance hasn't changed
const MAX_RETRIES = 5; // Retry up to 5 times if balance hasn't changed after external transaction

/**
 * Request wallet refresh with debouncing
 * @param wallet - Wallet address to refresh
 * @param immediate - If true, wait 5 seconds before refresh (for external transactions)
 * @param expectBalanceChange - If true, retry until balance changes (for external transactions)
 */
export function requestWalletRefresh(wallet: string, immediate = false, expectBalanceChange = false) {
  const t = perWalletTimers.get(wallet);
  if (t) clearTimeout(t);
  
  const delay = immediate ? IMMEDIATE_REFRESH_MS : DEBOUNCE_MS;
  
  const timer = setTimeout(async () => {
    await refreshNow(wallet, 0, expectBalanceChange);
  }, delay);
  
  perWalletTimers.set(wallet, timer);
  
  logger.info('[REFRESH] Wallet refresh requested', { wallet, immediate, expectBalanceChange, delay });
}

/**
 * Immediately refresh wallet balance with retry logic
 * Retries until balance changes (for external transactions) or max retries reached
 */
export async function refreshNow(wallet: string, retryCount = 0, expectBalanceChange = false): Promise<void> {
  logger.info('[REFRESH] Starting refreshNow for wallet', { wallet, retryCount, expectBalanceChange });
  
  if (inFlight.has(wallet) && retryCount === 0) {
    logger.info('[REFRESH] Wallet already refreshing, returning existing promise', { wallet });
    return inFlight.get(wallet)!;
  }
  
  const job = globalQueue
    .add(async () => {
      try {
        const startTime = Date.now();
        
        // Import services dynamically to avoid circular dependencies
        const { heliusBalanceService } = await import('../services/HeliusBalanceService');
        const { balanceCacheService } = await import('../services/BalanceCacheService');
        
        // Get previous balance for comparison (to detect if update actually happened)
        const previousCache = await balanceCacheService.getFromCache(wallet);
        const previousSolValue = previousCache?.totalSolValue || 0;
        const previousUsdValue = previousCache?.totalUsdValue || 0;
        
        // Fetch live portfolio from Helius
        logger.info('[REFRESH] Fetching portfolio from Helius', { wallet, retryCount, expectBalanceChange });
        const portfolio = await heliusBalanceService.getWalletPortfolio(wallet);
        
        if (!portfolio) {
          throw new Error('Failed to fetch portfolio from Helius');
        }
        
        // Check if balance actually changed (compare both SOL and USD values)
        const solDifference = Math.abs(portfolio.totalSolValue - previousSolValue);
        const usdDifference = Math.abs(portfolio.totalUsdValue - previousUsdValue);
        const balanceChanged = solDifference > 0.00001 || usdDifference > 0.01; // SOL: 0.00001, USD: $0.01
        
        // Update cache
        logger.info('[REFRESH] Updating balance cache', { 
          wallet, 
          previousSol: previousSolValue,
          previousUsd: previousUsdValue,
          newSol: portfolio.totalSolValue,
          newUsd: portfolio.totalUsdValue,
          solDifference,
          usdDifference,
          balanceChanged,
          retryCount,
          expectBalanceChange
        });
        
        try {
          await balanceCacheService.updateCache(wallet, portfolio);
          logger.info('[REFRESH] ✅ Balance cache updated successfully', { wallet });
        } catch (cacheError: any) {
          logger.error('[REFRESH] ❌ Failed to update balance cache', { 
            wallet, 
            error: cacheError?.message || cacheError,
            stack: cacheError?.stack 
          });
          throw cacheError; // Re-throw to trigger retry
        }
        
        // If we're expecting a balance change (external transaction detected) and balance hasn't changed,
        // and we haven't exceeded max retries, schedule another retry
        if (expectBalanceChange && !balanceChanged && retryCount < MAX_RETRIES) {
          logger.warn('[REFRESH] Balance has not changed yet after external transaction, scheduling retry', {
            wallet,
            retryCount,
            maxRetries: MAX_RETRIES,
            previousSol: previousSolValue,
            currentSol: portfolio.totalSolValue,
            solDifference,
            nextRetryIn: RETRY_DELAY_MS
          });
          
          // Schedule another retry after delay (non-blocking)
          setTimeout(async () => {
            try {
              await refreshNow(wallet, retryCount + 1, true); // Continue expecting balance change
            } catch (retryError: any) {
              logger.error('[REFRESH] Retry failed', { 
                wallet, 
                retryError: retryError?.message || retryError,
                retryCount: retryCount + 1 
              });
            }
          }, RETRY_DELAY_MS);
          
          // Don't throw error - we're retrying in background
          return;
        } else if (expectBalanceChange && !balanceChanged && retryCount >= MAX_RETRIES) {
          logger.error('[REFRESH] ⚠️ Balance still unchanged after max retries - transaction may not have propagated yet', {
            wallet,
            retryCount,
            maxRetries: MAX_RETRIES,
            previousSol: previousSolValue,
            currentSol: portfolio.totalSolValue,
            solDifference
          });
        } else if (expectBalanceChange && balanceChanged) {
          logger.info('[REFRESH] ✅ Balance changed confirmed after external transaction', {
            wallet,
            retryCount,
            previousSol: previousSolValue,
            currentSol: portfolio.totalSolValue,
            solDifference
          });
        }
        
        // Check for new external transactions (deposits)
        // This ensures transactions are detected even if WebSocket wasn't triggered
        try {
          const { externalTransactionService } = await import('../services/ExternalTransactionService');
          const externalTxs = await externalTransactionService.checkForExternalDeposits(wallet);
          
          if (externalTxs.length > 0) {
            logger.info('[REFRESH] Found new external transactions during balance refresh', {
              wallet,
              count: externalTxs.length
            });
            
            const userId = await externalTransactionService.getUserIdByWallet(wallet);
            if (userId) {
              for (const tx of externalTxs) {
                await externalTransactionService.storeExternalTransaction(tx, userId);
              }
            }
          }
        } catch (error) {
          // Don't fail the refresh if transaction detection fails
          logger.error('[REFRESH] Error checking external transactions during refresh', { error, wallet });
        }
        
        // Create balance update event
        await balanceCacheService.createBalanceUpdateEvent(
          wallet, 
          'manual_refresh',
          undefined,
          portfolio.tokens.map(t => t.mint)
        );
        
        // Notify frontend WebSocket clients
        const { frontendWebSocketServer } = await import('../services/FrontendWebSocketServer');
        frontendWebSocketServer.emitWalletUpdate(wallet, portfolio);
        
        // Emit SSE event for frontend (legacy)
        const { emitWalletUpdated } = await import('./events');
        emitWalletUpdated(wallet, 'cache_update', { 
          totalSolValue: portfolio.totalSolValue, 
          totalUsdValue: portfolio.totalUsdValue 
        });
        
        const duration = Date.now() - startTime;
        logger.info('[REFRESH] ✅ Wallet refresh completed successfully', { 
          wallet, 
          duration,
          totalSolValue: portfolio.totalSolValue,
          totalUsdValue: portfolio.totalUsdValue,
          tokenCount: portfolio.tokens.length,
          retryCount,
          balanceChanged,
          previousSol: previousSolValue
        });
        
      } catch (error: any) {
        logger.error('[REFRESH] ❌ Error in refreshNow job', { 
          wallet, 
          error: error?.message || error,
          stack: error?.stack,
          retryCount
        });
        
        // If we haven't exceeded max retries and this wasn't already a retry, schedule one
        if (retryCount < MAX_RETRIES) {
          logger.info('[REFRESH] Scheduling retry after error', { 
            wallet, 
            retryCount,
            nextRetryIn: RETRY_DELAY_MS 
          });
          
          setTimeout(async () => {
            try {
              await refreshNow(wallet, retryCount + 1);
            } catch (retryError) {
              logger.error('[REFRESH] Retry after error failed', { 
                wallet, 
                retryError,
                retryCount: retryCount + 1 
              });
            }
          }, RETRY_DELAY_MS);
        } else {
          logger.error('[REFRESH] Max retries exceeded, giving up', { wallet, retryCount });
        }
        
        throw error;
      }
    })
    .finally(() => {
      // Only delete from inFlight if this wasn't a retry (retries use a new promise)
      if (retryCount === 0) {
        inFlight.delete(wallet);
      }
    });
    
  // Only set inFlight for first attempt (retries don't block)
  if (retryCount === 0) {
    inFlight.set(wallet, job);
  }
  return job;
}

/**
 * Refresh multiple wallets in parallel
 */
export async function refreshMultipleWallets(wallets: string[]): Promise<void> {
  logger.info('[REFRESH] Refreshing multiple wallets', { count: wallets.length });
  
  const refreshPromises = wallets.map(wallet => refreshNow(wallet));
  
  try {
    await Promise.all(refreshPromises);
    logger.info('[REFRESH] Multiple wallet refresh completed', { count: wallets.length });
  } catch (error) {
    logger.error('[REFRESH] Error in multiple wallet refresh', { error, count: wallets.length });
  }
}

/**
 * Cancel pending refresh for a wallet
 */
export function cancelWalletRefresh(wallet: string): void {
  const timer = perWalletTimers.get(wallet);
  if (timer) {
    clearTimeout(timer);
    perWalletTimers.delete(wallet);
    logger.info('[REFRESH] Cancelled wallet refresh', { wallet });
  }
}

/**
 * Get refresh status for a wallet
 */
export function getWalletRefreshStatus(wallet: string): {
  hasPendingRefresh: boolean;
  isRefreshing: boolean;
} {
  return {
    hasPendingRefresh: perWalletTimers.has(wallet),
    isRefreshing: inFlight.has(wallet)
  };
}

/**
 * Clear all pending refreshes
 */
export function clearAllPendingRefreshes(): void {
  for (const [wallet, timer] of perWalletTimers) {
    clearTimeout(timer);
  }
  perWalletTimers.clear();
  logger.info('[REFRESH] Cleared all pending refreshes');
}

/**
 * Get queue statistics
 */
export function getQueueStats(): {
  pending: number;
  size: number;
  running: number;
} {
  return {
    pending: globalQueue.pending,
    size: globalQueue.size,
    running: 0 // PQueue doesn't expose running count
  };
}
