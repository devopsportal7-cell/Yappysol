import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { TABLES } from '../lib/supabase';
import { getWs, enqueueAfterOpen, isWsOpen } from '../lib/solanaWs';
import { subscribeWalletsBatch, unsubscribeWallet } from './realtime';

export class WebsocketBalanceSubscriber {
  private subscribedWallets = new Set<string>();
  private subscriptionIds = new Map<string, number>(); // Track subscription IDs
  private requestIdToWallet = new Map<number, string>(); // Track request ID to wallet mapping

  constructor() {
    // Initialize the shared WebSocket
    getWs();
    
    // Set up message handler
    const ws = getWs();
    ws.on('message', (data) => {
      this.onMessage(data.toString());
    });
  }

  // Removed - now using shared WebSocket from solanaWs.ts

  private async onMessage(raw: string) {
    try {
      const message = JSON.parse(raw);
      
      // Handle Solana WebSocket subscription responses
      if (message.id && message.result) {
        // This is a subscription confirmation
        const requestId = message.id;
        const actualSubscriptionId = message.result;
        
        // Find the wallet address by matching the request ID
        const walletAddress = this.getWalletByRequestId(requestId);
        if (walletAddress) {
          // Update the subscription ID mapping
          this.subscriptionIds.set(walletAddress, actualSubscriptionId);
          logger.info('[WSS] Solana subscription confirmed', { 
            walletAddress,
            requestId, 
            subscriptionId: actualSubscriptionId 
          });
        } else {
          logger.warn('[WSS] Unknown request ID in subscription confirmation', { 
            requestId, 
            subscriptionId: actualSubscriptionId 
          });
        }
        return;
      }
      
      // Handle Solana account notifications
      if (message.method === 'accountNotification') {
        const params = message.params;
        const subscriptionId = params.subscription;
        const accountInfo = params.result;
        
        // Find wallet address by subscription ID
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
        const { requestWalletRefresh } = await import('../lib/portfolio-refresh');
        requestWalletRefresh(walletAddress, true); // Immediate refresh
        
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
          requestWalletRefresh(wallet, true);
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
   */
  private async checkForExternalTransactions(
    walletAddress: string, 
    notificationReceivedTimestamp: number
  ): Promise<void> {
    try {
      logger.info('[WSS] Checking for external transactions', { walletAddress });
      
      // Check for external deposits
      const externalTxs = await externalTransactionService.checkForExternalDeposits(walletAddress);
      
      if (externalTxs.length > 0) {
        logger.info(`[WSS] Found ${externalTxs.length} new external transactions`, {
          wallet: walletAddress,
          count: externalTxs.length,
          transactions: externalTxs.map(tx => ({
            signature: tx.signature,
            amount: tx.amount,
            tokenSymbol: tx.tokenSymbol,
            sender: tx.sender,
            blockTime: tx.blockTime
          }))
        });
        
        // Get user ID and store transactions
        const userId = await externalTransactionService.getUserIdByWallet(walletAddress);
        if (userId) {
          for (const tx of externalTxs) {
            await externalTransactionService.storeExternalTransaction(
              tx, 
              userId,
              notificationReceivedTimestamp
            );
          }
        }
      }
    } catch (error) {
      logger.error('[WSS] Error checking external transactions', { error, walletAddress });
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
      
      // Clean up request ID mapping
      for (const [requestId, wallet] of this.requestIdToWallet) {
        if (wallet === walletAddress) {
          this.requestIdToWallet.delete(requestId);
          break;
        }
      }
      
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
   */
  private getWalletBySubscriptionId(subscriptionId: number): string | null {
    for (const [wallet, id] of this.subscriptionIds) {
      if (id === subscriptionId) {
        return wallet;
      }
    }
    return null;
  }

  /**
   * Get wallet address by request ID
   */
  private getWalletByRequestId(requestId: number): string | null {
    return this.requestIdToWallet.get(requestId) || null;
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
    this.requestIdToWallet.clear();
    logger.info('[WSS] WebSocket subscriber cleaned up');
  }
}

export const websocketBalanceSubscriber = new WebsocketBalanceSubscriber();
