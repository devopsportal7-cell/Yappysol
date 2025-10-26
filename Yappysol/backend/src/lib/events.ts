import { EventEmitter } from 'events';
import { logger } from '../utils/logger';

export type WalletUpdatedPayload = {
  wallet: string;
  updatedAt: string;
  reason?: 'external_tx' | 'send' | 'manual_refresh' | 'transaction' | 'cache_update' | 'balance_updated';
  totals?: { totalSolValue: number; totalUsdValue: number };
  transactionHash?: string;
  metadata?: any;
};

const bus = new EventEmitter();

/**
 * Emit wallet updated event
 */
export function emitWalletUpdated(
  wallet: string,
  reason?: WalletUpdatedPayload['reason'],
  metadata?: { 
    totalSolValue?: number; 
    totalUsdValue?: number; 
    transactionHash?: string; 
    amount?: number;
    tokenSymbol?: string;
    valueUsd?: number;
    [key: string]: any 
  }
) {
  const payload: WalletUpdatedPayload = { 
    wallet, 
    updatedAt: new Date().toISOString(), 
    reason,
    totals: metadata?.totalSolValue !== undefined ? { 
      totalSolValue: metadata.totalSolValue, 
      totalUsdValue: metadata.totalUsdValue || 0 
    } : undefined,
    transactionHash: metadata?.transactionHash,
    metadata
  };
  
  bus.emit('wallet-updated', payload);
  
  logger.info('[EVENTS] Wallet updated event emitted', {
    wallet,
    reason,
    totalSolValue: metadata?.totalSolValue,
    totalUsdValue: metadata?.totalUsdValue,
    transactionHash: metadata?.transactionHash
  });
}

/**
 * Subscribe to wallet updated events
 */
export function onWalletUpdated(listener: (payload: WalletUpdatedPayload) => void) {
  bus.on('wallet-updated', listener);
  return () => bus.off('wallet-updated', listener);
}

/**
 * Subscribe to wallet updated events for a specific wallet
 */
export function onWalletUpdatedForWallet(
  wallet: string, 
  listener: (payload: WalletUpdatedPayload) => void
) {
  const wrappedListener = (payload: WalletUpdatedPayload) => {
    if (payload.wallet === wallet) {
      listener(payload);
    }
  };
  
  bus.on('wallet-updated', wrappedListener);
  return () => bus.off('wallet-updated', wrappedListener);
}

/**
 * Emit external transaction detected event
 */
export function emitExternalTransactionDetected(
  wallet: string,
  transaction: {
    signature: string;
    amount: number;
    tokenSymbol: string;
    sender: string;
    valueUsd?: number;
  }
) {
  emitWalletUpdated(wallet, 'external_tx', {
    transactionHash: transaction.signature,
    amount: transaction.amount,
    tokenSymbol: transaction.tokenSymbol,
    valueUsd: transaction.valueUsd,
    sender: transaction.sender
  });
}

/**
 * Emit balance cache updated event
 */
export function emitBalanceCacheUpdated(
  wallet: string,
  totals: {
    totalSolValue: number;
    totalUsdValue: number;
  }
) {
  emitWalletUpdated(wallet, 'cache_update', {
    totalSolValue: totals.totalSolValue,
    totalUsdValue: totals.totalUsdValue
  });
}

/**
 * Emit manual refresh completed event
 */
export function emitManualRefreshCompleted(
  wallet: string,
  totals: {
    totalSolValue: number;
    totalUsdValue: number;
  }
) {
  emitWalletUpdated(wallet, 'manual_refresh', {
    totalSolValue: totals.totalSolValue,
    totalUsdValue: totals.totalUsdValue
  });
}

/**
 * Get event emitter instance (for advanced usage)
 */
export function getEventBus(): EventEmitter {
  return bus;
}

/**
 * Get active listener count
 */
export function getListenerCount(): number {
  return bus.listenerCount('wallet-updated');
}

/**
 * Remove all listeners
 */
export function removeAllListeners(): void {
  bus.removeAllListeners('wallet-updated');
  logger.info('[EVENTS] Removed all wallet-updated listeners');
}

