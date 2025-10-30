import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { TABLES } from '../lib/supabase';
import { getWs, enqueueAfterOpen, isWsOpen } from '../lib/solanaWs';
import { subscribeWalletsBatch, unsubscribeWallet } from './realtime';

export class WebsocketBalanceSubscriber {
  private subscribedWallets = new Set<string>();
  private subscriptionIds = new Map<string, number>(); // wallet -> subscriptionId from Solana

  constructor() {
    // Initialize the shared WebSocket
    getWs();
    
    // Set up message handler
    const ws = getWs();
    ws.on('message', (data) => {
      this.onMessage(data.toString());
    });
  }

  private async onMessage(raw: string) {
    try {
      const message = JSON.parse(raw);
      
      // Note: Subscription confirmations are now handled by realtime.ts
      // via the rpcBus event system. We don't need to handle them here anymore.
      
      // Handle Solana account notifications
      if (message.method === 'accountNotification') {
        const params = message.params;
        const subscriptionId = params.subscription;
        const accountInfo = params.result;
        
        // Find wallet address by subscription ID (from realtime.ts)
        const walletAddress = this.getWalletBySubscriptionId(subscriptionId);
        if (!walletAddress) {
          logger.warn('[WSS] Unknown subscription ID', { subscriptionId });
          return;
        }
        
        const notificationReceivedTimestamp = Date.now();
        
        logger.info('[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!', { 
          wallet: walletAddress,
          subscriptionId,
          slot: accountInfo.context?.slot,
          lamports: accountInfo.value?.lamports,
          timestamp: new Date().toISOString()
        });
        
        // Check for external transactions when account changes
        logger.info('[WSS] 🔍 Checking for external transactions...');
        await this.checkForExternalTransactions(walletAddress, notificationReceivedTimestamp);
        logger.info('[WSS] ✅ External transaction check completed');
        
        // Trigger immediate balance refresh from Helius and update cache
        // Pass expectBalanceChange=true to retry until balance actually changes
        const { requestWalletRefresh } = await import('../lib/portfolio-refresh');
        requestWalletRefresh(walletAddress, true, true); // Immediate refresh, expect balance change
        
        // Notify frontend WebSocket clients
        const { frontendWebSocketServer } = await import('./FrontendWebSocketServer');
        frontendWebSocketServer.emitBalanceUpdate(walletAddress, {
          reason: 'account_change',
          slot: accountInfo.context?.slot,
          lamports: accountInfo.value?.lamports
        });
        
        logger.info('[WSS] Account change detected, refreshing balance cache', { 
          walletAddress, 
          subscriptionId 
        });
        
      } else if (message.method === 'logsNotification') {
        // Handle transaction logs notifications
        const params = message.params;
        const subscriptionId = params.subscription;
        const logs = params.result;
        
        logger.info('[WSS] Solana logs notification received', { 
          subscriptionId,
          logs: logs.signature
        });
        
        // Extract wallet address from logs if possible
        // This is more complex and might need transaction analysis
        // For now, we'll rely on account notifications
        
      } else if (message.method === 'signatureNotification') {
        // Handle transaction signature notifications
        const params = message.params;
        const subscriptionId = params.subscription;
        const signature = params.result;
        
        logger.info('[WSS] Solana signature notification received', { 
          subscriptionId,
          signature: signature.signature,
          err: signature.err
        });
        
        // Trigger balance refresh for any wallet that might be affected
        // This is a broad refresh - in production you might want to be more specific
        const { requestWalletRefresh } = await import('../lib/portfolio-refresh');
        for (const wallet of this.subscribedWallets) {
          requestWalletRefresh(wallet, true, true); // Expect balance change for external transactions
        }
        
      } else {
        logger.debug('[WSS] Unknown Solana message type', { 
          method: message.method,
          id: message.id 
        });
      }
    } catch (error) {
      logger.warn('[WSS] Parse error', { error, raw });
    }
  }

  /**
   * Check for external transactions when account changes detected
   * NOTE: This is now a NO-OP since transactions are detected via Helius webhooks
   * The WebSocket is still used for triggering balance refreshes
   */
  private async checkForExternalTransactions(
    walletAddress: string, 
    notificationReceivedTimestamp: number
  ): Promise<void> {
    try {
      logger.info('[WSS] Account change detected - balance refresh triggered', { walletAddress });
      
      // External transactions are now handled by Helius webhooks
      // No need to poll Helius API - webhooks provide all transaction data
      
      logger.info('[WSS] Transaction detection now handled by Helius webhooks', { walletAddress });
    } catch (error) {
      logger.error('[WSS] Error processing account change', { error, walletAddress });
    }
  }

  /**
   * Subscribe to account notifications for a wallet using Solana WebSocket format
   * Uses the new queue-based system from realtime service
   */
  async subscribeToWallet(walletAddress: string): Promise<boolean> {
    try {
      // Use the realtime service which handles queuing
      subscribeWalletsBatch([walletAddress]);
      this.subscribedWallets.add(walletAddress);
      
      logger.info('[WSS] Subscribed to wallet', { walletAddress });
      return true;
    } catch (error) {
      logger.error('[WSS] Error subscribing to wallet', { error, walletAddress });
      return false;
    }
  }

  /**
   * Unsubscribe from account notifications for a wallet using Solana WebSocket format
   */
  async unsubscribeFromWallet(walletAddress: string): Promise<boolean> {
    try {
      unsubscribeWallet(walletAddress);
      
      this.subscribedWallets.delete(walletAddress);
      const subscriptionId = this.subscriptionIds.get(walletAddress);
      this.subscriptionIds.delete(walletAddress);
      
      logger.info('[WSS] Unsubscribed from Solana wallet', { 
        walletAddress, 
        subscriptionId 
      });
      return true;
    } catch (error) {
      logger.error('[WSS] Error unsubscribing from wallet', { error, walletAddress });
      return false;
    }
  }

  /**
   * Get wallet address by subscription ID
   * Also checks realtime.ts subscription map for accurate tracking
   */
  private getWalletBySubscriptionId(subscriptionId: number): string | null {
    // Check local map first
    for (const [wallet, id] of this.subscriptionIds) {
      if (id === subscriptionId) {
        return wallet;
      }
    }
    
    // If not found locally, try to get from realtime.ts
    // (realtime.ts maintains the authoritative subscription map)
    try {
      const { getSubscriptionStatus } = require('./realtime');
      const status = getSubscriptionStatus();
      // subscriptionIds are maintained by realtime.ts now
      // We rely on realtime.ts to track subscriptions properly
    } catch (e) {
      // Ignore import errors
    }
    
    return null;
  }

  // Removed resubscribe - handled by realtime service

  /**
   * Subscribe to all user wallets using batch subscription
   */
  async subscribeToAllUserWallets(): Promise<void> {
    try {
      const { supabase } = await import('../lib/supabase');
      
      const { data: wallets, error } = await supabase
        .from(TABLES.WALLETS)
        .select('public_key');

      if (error || !wallets) {
        logger.error('[WSS] Error fetching user wallets', { error });
        return;
      }

      const walletAddresses = wallets.map((w: any) => w.public_key);
      logger.info('[WSS] Batch subscribing to all user wallets', { count: walletAddresses.length });

      // Use batch subscription from realtime service
      subscribeWalletsBatch(walletAddresses);
      
      // Track subscribed wallets
      walletAddresses.forEach((addr: string) => this.subscribedWallets.add(addr));
    } catch (error) {
      logger.error('[WSS] Error subscribing to all user wallets', { error });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    subscribedWallets: number;
  } {
    return {
      isConnected: isWsOpen(),
      subscribedWallets: this.subscribedWallets.size
    };
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    // The WebSocket is managed by solanaWs.ts, so we just clean up local state
    this.subscribedWallets.clear();
    this.subscriptionIds.clear();
    logger.info('[WSS] WebSocket subscriber cleaned up');
  }
}

export const websocketBalanceSubscriber = new WebsocketBalanceSubscriber();
