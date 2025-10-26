import WebSocket from 'ws';
import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface FrontendWebSocketMessage {
  type: 'portfolio_update' | 'balance_update' | 'transaction_update';
  walletAddress: string;
  data: any;
  timestamp: string;
}

export class FrontendWebSocketServer {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, WebSocket> = new Map();
  private eventEmitter: EventEmitter;

  constructor() {
    this.eventEmitter = new EventEmitter();
    this.setupEventListeners();
  }

  /**
   * Attach WebSocket server to existing HTTP server
   */
  attachToServer(server: any): void {
    try {
      this.wss = new WebSocket.Server({ 
        server,
        path: '/ws'
      });

      this.wss.on('connection', (ws: WebSocket, req) => {
        const clientId = this.generateClientId();
        this.clients.set(clientId, ws);
        
        logger.info('[Frontend WS] Client connected', { 
          clientId, 
          totalClients: this.clients.size,
          userAgent: req.headers['user-agent']
        });

        // Send welcome message
        this.sendToClient(clientId, {
          type: 'connection',
          message: 'Connected to Yappysol WebSocket',
          timestamp: new Date().toISOString()
        });

        // Handle client messages
        ws.on('message', (data) => {
          try {
            const message = JSON.parse(data.toString());
            this.handleClientMessage(clientId, message);
          } catch (error) {
            logger.warn('[Frontend WS] Invalid message from client', { clientId, error });
          }
        });

        // Handle client disconnect
        ws.on('close', () => {
          this.clients.delete(clientId);
          logger.info('[Frontend WS] Client disconnected', { 
            clientId, 
            totalClients: this.clients.size 
          });
        });

        // Handle client errors
        ws.on('error', (error) => {
          logger.error('[Frontend WS] Client error', { clientId, error });
          this.clients.delete(clientId);
        });
      });

      this.wss.on('error', (error) => {
        logger.error('[Frontend WS] Server error', { error });
      });

      logger.info('[Frontend WS] Server attached to HTTP server', { path: '/ws' });
    } catch (error) {
      logger.error('[Frontend WS] Failed to attach server', { error });
    }
  }

  /**
   * Start standalone WebSocket server (deprecated - use attachToServer instead)
   */
  start(port: number = 8080): void {
    logger.warn('[Frontend WS] Using deprecated start() method. Use attachToServer() instead.');
    this.attachToServer({ port } as any);
  }

  /**
   * Handle messages from frontend clients
   */
  private handleClientMessage(clientId: string, message: any): void {
    logger.debug('[Frontend WS] Client message', { clientId, message });

    switch (message.type) {
      case 'subscribe_wallet':
        // Client wants to subscribe to wallet updates
        this.subscribeClientToWallet(clientId, message.walletAddress);
        break;
      
      case 'unsubscribe_wallet':
        // Client wants to unsubscribe from wallet updates
        this.unsubscribeClientFromWallet(clientId, message.walletAddress);
        break;
      
      case 'ping':
        // Heartbeat
        this.sendToClient(clientId, { type: 'pong', timestamp: new Date().toISOString() });
        break;
      
      default:
        logger.warn('[Frontend WS] Unknown message type', { clientId, type: message.type });
    }
  }

  /**
   * Subscribe client to wallet updates
   */
  private subscribeClientToWallet(clientId: string, walletAddress: string): void {
    // Store subscription info (you might want to use a more sophisticated mapping)
    const client = this.clients.get(clientId);
    if (client) {
      (client as any).subscribedWallets = (client as any).subscribedWallets || new Set();
      (client as any).subscribedWallets.add(walletAddress);
      
      logger.info('[Frontend WS] Client subscribed to wallet', { clientId, walletAddress });
      
      this.sendToClient(clientId, {
        type: 'subscription_confirmed',
        walletAddress,
        message: 'Subscribed to wallet updates',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Unsubscribe client from wallet updates
   */
  private unsubscribeClientFromWallet(clientId: string, walletAddress: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      (client as any).subscribedWallets = (client as any).subscribedWallets || new Set();
      (client as any).subscribedWallets.delete(walletAddress);
      
      logger.info('[Frontend WS] Client unsubscribed from wallet', { clientId, walletAddress });
      
      this.sendToClient(clientId, {
        type: 'unsubscription_confirmed',
        walletAddress,
        message: 'Unsubscribed from wallet updates',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (client && client.readyState === WebSocket.OPEN) {
      try {
        client.send(JSON.stringify(message));
      } catch (error) {
        logger.error('[Frontend WS] Failed to send message to client', { clientId, error });
        this.clients.delete(clientId);
      }
    }
  }

  /**
   * Broadcast portfolio update to all subscribed clients
   */
  broadcastPortfolioUpdate(walletAddress: string, portfolioData: any): void {
    const message: FrontendWebSocketMessage = {
      type: 'portfolio_update',
      walletAddress,
      data: portfolioData,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        const subscribedWallets = (client as any).subscribedWallets || new Set();
        if (subscribedWallets.has(walletAddress)) {
          try {
            client.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            logger.error('[Frontend WS] Failed to broadcast to client', { clientId, error });
            this.clients.delete(clientId);
          }
        }
      }
    }

    logger.info('[Frontend WS] Portfolio update broadcasted', { 
      walletAddress, 
      sentToClients: sentCount,
      totalClients: this.clients.size 
    });
  }

  /**
   * Broadcast balance update to all subscribed clients
   */
  broadcastBalanceUpdate(walletAddress: string, balanceData: any): void {
    const message: FrontendWebSocketMessage = {
      type: 'balance_update',
      walletAddress,
      data: balanceData,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        const subscribedWallets = (client as any).subscribedWallets || new Set();
        if (subscribedWallets.has(walletAddress)) {
          try {
            client.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            logger.error('[Frontend WS] Failed to broadcast to client', { clientId, error });
            this.clients.delete(clientId);
          }
        }
      }
    }

    logger.info('[Frontend WS] Balance update broadcasted', { 
      walletAddress, 
      sentToClients: sentCount,
      totalClients: this.clients.size 
    });
  }

  /**
   * Broadcast transaction update to all subscribed clients
   */
  broadcastTransactionUpdate(walletAddress: string, transactionData: any): void {
    const message: FrontendWebSocketMessage = {
      type: 'transaction_update',
      walletAddress,
      data: transactionData,
      timestamp: new Date().toISOString()
    };

    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        const subscribedWallets = (client as any).subscribedWallets || new Set();
        if (subscribedWallets.has(walletAddress)) {
          try {
            client.send(JSON.stringify(message));
            sentCount++;
          } catch (error) {
            logger.error('[Frontend WS] Failed to broadcast to client', { clientId, error });
            this.clients.delete(clientId);
          }
        }
      }
    }

    logger.info('[Frontend WS] Transaction update broadcasted', { 
      walletAddress, 
      sentToClients: sentCount,
      totalClients: this.clients.size 
    });
  }

  /**
   * Setup event listeners for backend events
   */
  private setupEventListeners(): void {
    // Listen for wallet update events from the backend
    this.eventEmitter.on('wallet-updated', (data) => {
      this.broadcastPortfolioUpdate(data.wallet, data.portfolio);
    });

    this.eventEmitter.on('balance-updated', (data) => {
      this.broadcastBalanceUpdate(data.wallet, data.balance);
    });

    this.eventEmitter.on('transaction-detected', (data) => {
      this.broadcastTransactionUpdate(data.wallet, data.transaction);
    });
  }

  /**
   * Emit events from backend services
   */
  emitWalletUpdate(walletAddress: string, portfolioData: any): void {
    this.eventEmitter.emit('wallet-updated', { wallet: walletAddress, portfolio: portfolioData });
  }

  emitBalanceUpdate(walletAddress: string, balanceData: any): void {
    this.eventEmitter.emit('balance-updated', { wallet: walletAddress, balance: balanceData });
  }

  emitTransactionUpdate(walletAddress: string, transactionData: any): void {
    this.eventEmitter.emit('transaction-detected', { wallet: walletAddress, transaction: transactionData });
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get server status
   */
  getStatus(): {
    isRunning: boolean;
    clientCount: number;
    port?: number;
  } {
    return {
      isRunning: this.wss !== null,
      clientCount: this.clients.size,
      port: this.wss ? (this.wss as any).options.port : undefined
    };
  }

  /**
   * Stop the WebSocket server
   */
  stop(): void {
    if (this.wss) {
      this.wss.close();
      this.wss = null;
      this.clients.clear();
      logger.info('[Frontend WS] Server stopped');
    }
  }
}

export const frontendWebSocketServer = new FrontendWebSocketServer();

