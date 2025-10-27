import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { TABLES } from '../lib/supabase';

export class WebsocketBalanceSubscriber {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 30000; // 30 seconds (increased to reduce rate limit issues)
  private isConnected = false;
  private subscribedWallets = new Set<string>();
  private subscriptionIds = new Map<string, number>(); // Track subscription IDs
  private requestIdToWallet = new Map<number, string>(); // Track request ID to wallet mapping
  private consecutiveFailures = 0; // Track consecutive connection failures
  private maxConsecutiveFailures = 5; // Disable after 5 consecutive failures

  constructor() {
    this.connect();
  }

  private connect() {
    try {
      // Use Solana WebSocket endpoint from environment
      // Default to native Solana WebSocket
      const wsUrl = process.env.SOLANA_WSS_URL || 'wss://api.mainnet-beta.solana.com';
      
      logger.info('[WSS] Connecting to Solana WebSocket', { url: wsUrl });

      this.ws = new WebSocket(wsUrl);

      this.ws.on('open', () => {
        logger.info('[WSS] Connected to Solana WebSocket');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        this.consecutiveFailures = 0; // Reset failure counter on successful connection
        
        // Resubscribe to all wallets
        this.resubscribeAllWallets();
      });

      this.ws.on('message', (data) => {
        this.onMessage(data.toString());
      });

      this.ws.on('close', (code, reason) => {
        logger.warn('[WSS] WebSocket connection closed', { code, reason: reason.toString() });
        this.isConnected = false;
        this.subscriptionIds.clear();
        this.requestIdToWallet.clear();
        this.scheduleReconnect();
      });

      this.ws.on('error', (error) => {
        logger.error('[WSS] WebSocket error', { error: error.message || error });
        this.isConnected = false;
      });

    } catch (error) {
      logger.error('[WSS] Error connecting to WebSocket', { error });
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    this.consecutiveFailures++;
    
    // If we've failed too many times, disable WebSocket to avoid spam
    if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
      logger.error('[WSS] Too many consecutive failures, disabling WebSocket to avoid rate limits. Will retry on next deployment.', {
        consecutiveFailures: this.consecutiveFailures,
        message: 'WebSocket disabled due to rate limits. External transactions will still be detected via manual refresh.'
      });
      return;
    }
    
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('[WSS] Max reconnection attempts reached, giving up');
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1), // Exponential backoff
      300000 // Max 5 minutes between retries
    );
    
    logger.info('[WSS] Scheduling reconnection', { 
      attempt: this.reconnectAttempts, 
      delay,
      consecutiveFailures: this.consecutiveFailures
    });

    setTimeout(() => {
      this.connect();
    }, delay);
  }

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
   */
  async subscribeToWallet(walletAddress: string): Promise<boolean> {
    if (!this.isConnected || !this.ws) {
      logger.warn('[WSS] Cannot subscribe, WebSocket not connected', { walletAddress });
      return false;
    }

    try {
      const subscriptionId = Date.now();
      
      const subscribeMessage = {
        jsonrpc: '2.0',
        id: subscriptionId,
        method: 'accountSubscribe',
        params: [
          walletAddress,
          {
            encoding: 'base64',
            commitment: 'confirmed'
          }
        ]
      };

      this.ws.send(JSON.stringify(subscribeMessage));
      this.subscribedWallets.add(walletAddress);
      
      // Store the request ID to wallet mapping for subscription confirmation
      this.requestIdToWallet.set(subscriptionId, walletAddress);
      
      logger.info('[WSS] Subscribed to Solana wallet', { 
        walletAddress, 
        subscriptionId 
      });
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
    if (!this.isConnected || !this.ws) {
      logger.warn('[WSS] Cannot unsubscribe, WebSocket not connected', { walletAddress });
      return false;
    }

    try {
      const subscriptionId = this.subscriptionIds.get(walletAddress);
      if (!subscriptionId) {
        logger.warn('[WSS] No subscription ID found for wallet', { walletAddress });
        return false;
      }

      const unsubscribeMessage = {
        jsonrpc: '2.0',
        id: Date.now(),
        method: 'accountUnsubscribe',
        params: [subscriptionId]
      };

      this.ws.send(JSON.stringify(unsubscribeMessage));
      this.subscribedWallets.delete(walletAddress);
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

  /**
   * Resubscribe to all wallets
   */
  private async resubscribeAllWallets() {
    logger.info('[WSS] Resubscribing to all wallets', { count: this.subscribedWallets.size });
    
    for (const wallet of this.subscribedWallets) {
      await this.subscribeToWallet(wallet);
    }
  }

  /**
   * Subscribe to all user wallets
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

      logger.info('[WSS] Subscribing to all user wallets', { count: wallets.length });

      for (const wallet of wallets) {
        await this.subscribeToWallet(wallet.public_key);
      }
    } catch (error) {
      logger.error('[WSS] Error subscribing to all user wallets', { error });
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): {
    isConnected: boolean;
    reconnectAttempts: number;
    subscribedWallets: number;
  } {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscribedWallets: this.subscribedWallets.size
    };
  }

  /**
   * Close WebSocket connection
   */
  close(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribedWallets.clear();
    this.subscriptionIds.clear();
    this.requestIdToWallet.clear();
    logger.info('[WSS] WebSocket connection closed');
  }
}

export const websocketBalanceSubscriber = new WebsocketBalanceSubscriber();
