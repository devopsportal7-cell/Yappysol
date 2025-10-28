import PQueue from "p-queue";
import { logger } from '../utils/logger';

const perWalletTimers = new Map<string, NodeJS.Timeout>();
const inFlight = new Map<string, Promise<void>>();
const globalQueue = new PQueue({ concurrency: 6 });

const DEBOUNCE_MS = 800;
const IMMEDIATE_REFRESH_MS = 3000; // Increased to 3 seconds to allow Helius to propagate transaction

/**
 * Request wallet refresh with debouncing
 */
export function requestWalletRefresh(wallet: string, immediate = false) {
  const t = perWalletTimers.get(wallet);
  if (t) clearTimeout(t);
  
  const delay = immediate ? IMMEDIATE_REFRESH_MS : DEBOUNCE_MS;
  
  const timer = setTimeout(async () => {
    await refreshNow(wallet);
  }, delay);
  
  perWalletTimers.set(wallet, timer);
  
  logger.info('[REFRESH] Wallet refresh requested', { wallet, immediate, delay });
}

/**
 * Immediately refresh wallet balance
 */
export async function refreshNow(wallet: string) {
  logger.info('[REFRESH] Starting refreshNow for wallet', { wallet });
  
  if (inFlight.has(wallet)) {
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
        
        // Fetch live portfolio from Helius
        const portfolio = await heliusBalanceService.getWalletPortfolio(wallet);
        
        // Update cache
        await balanceCacheService.updateCache(wallet, portfolio);
        
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
        logger.info('[REFRESH] Wallet refresh completed', { 
          wallet, 
          duration,
          totalSolValue: portfolio.totalSolValue,
          totalUsdValue: portfolio.totalUsdValue,
          tokenCount: portfolio.tokens.length
        });
        
      } catch (error) {
        logger.error('[REFRESH] Error in refreshNow job', { wallet, error });
        throw error;
      }
    })
    .finally(() => {
      inFlight.delete(wallet);
    });
    
  inFlight.set(wallet, job);
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
