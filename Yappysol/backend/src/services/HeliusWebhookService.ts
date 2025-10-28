import { logger } from '../utils/logger';
import { httpClient } from '../lib/httpClient';

export interface HeliusWebhookConfig {
  webhookURL: string;
  transactionTypes: string[];
  accountAddresses: string[];
  webhookType?: 'enhanced' | 'raw';
}

export interface HeliusWebhookResponse {
  webhookID: string;
  wallet: string;
}

export class HeliusWebhookService {
  private apiKey: string;
  private baseUrl: string;
  private webhookUrl: string;
  private webhookId: string | null = null;

  constructor() {
    this.apiKey = process.env.HELIUS_API_KEY || '';
    this.baseUrl = process.env.HELIUS_BASE_URL || 'https://api.helius.xyz';
    this.webhookUrl = process.env.HELIUS_WEBHOOK_URL || `https://${process.env.RENDER_URL || 'yappysol.onrender.com'}/api/webhooks/helius`;
    
    if (!this.apiKey) {
      logger.warn('[HELIUS_WEBHOOK] HELIUS_API_KEY not configured');
    }
  }

  /**
   * Create or get existing Helius webhook
   */
  async initializeWebhook(): Promise<string | null> {
    try {
      // Check if we already have a webhook ID
      const existingWebhooks = await this.getAllWebhooks();
      
      if (existingWebhooks && existingWebhooks.length > 0) {
        // Find our webhook by URL
        const ourWebhook = existingWebhooks.find(w => w.webhook_url === this.webhookUrl);
        if (ourWebhook) {
          this.webhookId = ourWebhook.webhook_id;
          logger.info('[HELIUS_WEBHOOK] Using existing webhook', { webhookId: this.webhookId });
          return this.webhookId;
        }
      }

      // Create new webhook
      logger.info('[HELIUS_WEBHOOK] Creating new webhook', { webhookUrl: this.webhookUrl });
      
      const response = await httpClient.post(
        `${this.baseUrl}/v0/webhooks?api-key=${this.apiKey}`,
        {
          webhookURL: this.webhookUrl,
          transactionTypes: ['TRANSFER', 'SWAP'], // Monitor all transfers and swaps
          webhookType: 'enhanced',
          accountAddresses: [] // Will be added dynamically
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      this.webhookId = response.data.webhookID;
      logger.info('[HELIUS_WEBHOOK] Webhook created successfully', { webhookId: this.webhookId });
      return this.webhookId;
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error initializing webhook', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return null;
    }
  }

  /**
   * Get all webhooks
   */
  private async getAllWebhooks(): Promise<any[]> {
    try {
      const response = await httpClient.get(
        `${this.baseUrl}/v0/webhooks?api-key=${this.apiKey}`
      );
      return response.data || [];
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error getting webhooks', { error: error.message });
      return [];
    }
  }

  /**
   * Add wallet addresses to the webhook
   */
  async addWalletAddresses(addresses: string[]): Promise<boolean> {
    if (!this.webhookId) {
      logger.error('[HELIUS_WEBHOOK] No webhook ID. Call initializeWebhook first.');
      return false;
    }

    try {
      logger.info('[HELIUS_WEBHOOK] Adding wallet addresses to webhook', { 
        webhookId: this.webhookId,
        addressCount: addresses.length 
      });

      const response = await httpClient.put(
        `${this.baseUrl}/v0/webhooks/${this.webhookId}?api-key=${this.apiKey}`,
        {
          accountAddresses: addresses
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('[HELIUS_WEBHOOK] Wallet addresses added successfully', { 
        webhookId: this.webhookId,
        addedCount: addresses.length
      });
      return true;
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error adding wallet addresses', { 
        error: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      return false;
    }
  }

  /**
   * Get all addresses currently monitored by the webhook
   */
  async getWebhookAddresses(): Promise<string[]> {
    if (!this.webhookId) {
      logger.error('[HELIUS_WEBHOOK] No webhook ID.');
      return [];
    }

    try {
      const webhooks = await this.getAllWebhooks();
      const ourWebhook = webhooks.find(w => w.webhook_id === this.webhookId);
      return ourWebhook?.account_addresses || [];
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error getting webhook addresses', { error: error.message });
      return [];
    }
  }

  /**
   * Remove webhook (cleanup)
   */
  async removeWebhook(): Promise<boolean> {
    if (!this.webhookId) {
      logger.warn('[HELIUS_WEBHOOK] No webhook ID to remove');
      return false;
    }

    try {
      await httpClient.delete(
        `${this.baseUrl}/v0/webhooks/${this.webhookId}?api-key=${this.apiKey}`
      );
      logger.info('[HELIUS_WEBHOOK] Webhook removed', { webhookId: this.webhookId });
      this.webhookId = null;
      return true;
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error removing webhook', { error: error.message });
      return false;
    }
  }

  /**
   * Initialize with all user wallets
   */
  async initializeWithAllWallets(): Promise<void> {
    try {
      // Initialize webhook
      const webhookId = await this.initializeWebhook();
      if (!webhookId) {
        logger.error('[HELIUS_WEBHOOK] Failed to initialize webhook');
        return;
      }

      // Get all user wallets from database
      const { supabase } = await import('../lib/supabase');
      const { data: wallets, error } = await supabase
        .from('wallets')
        .select('public_key')
        .eq('is_active', true);

      if (error || !wallets || wallets.length === 0) {
        logger.warn('[HELIUS_WEBHOOK] No wallets found in database');
        return;
      }

      const walletAddresses = wallets.map((w: any) => w.public_key);
      
      // Add all wallets to webhook
      await this.addWalletAddresses(walletAddresses);
      
      logger.info('[HELIUS_WEBHOOK] Initialized with all user wallets', { 
        webhookId,
        walletCount: walletAddresses.length 
      });
    } catch (error: any) {
      logger.error('[HELIUS_WEBHOOK] Error initializing with all wallets', { error: error.message });
    }
  }
}

export const heliusWebhookService = new HeliusWebhookService();
