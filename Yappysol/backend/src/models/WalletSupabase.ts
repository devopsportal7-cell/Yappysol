import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import { supabase, TABLES } from '../lib/supabase';

export interface Wallet {
  id: string;
  user_id: string;
  public_key: string;
  encrypted_private_key: string;
  is_imported: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWalletData {
  userId: string;
  isImported?: boolean;
}

export interface ImportWalletData {
  userId: string;
  privateKey: string;
}

export class WalletModel {
  private static encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';

  private static encrypt(text: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    // Prepend IV to encrypted data
    return iv.toString('hex') + ':' + encrypted;
  }

  private static decrypt(encryptedText: string): string {
    const algorithm = 'aes-256-cbc';
    const key = crypto.scryptSync(this.encryptionKey, 'salt', 32);
    
    // Split IV and encrypted data
    const parts = encryptedText.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  static async createWallet(data: CreateWalletData): Promise<Wallet> {
    const id = uuidv4();
    const keypair = Keypair.generate();
    const publicKey = keypair.publicKey.toString();
    const privateKey = bs58.encode(keypair.secretKey);
    const encryptedPrivateKey = this.encrypt(privateKey);

    const wallet: Wallet = {
      id,
      user_id: data.userId,
      public_key: publicKey,
      encrypted_private_key: encryptedPrivateKey,
      is_imported: data.isImported || false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.WALLETS)
      .insert([wallet]);

    if (error) {
      throw new Error(`Failed to create wallet: ${error.message}`);
    }

    // Add wallet to Helius webhook monitoring
    try {
      const { heliusWebhookService } = await import('../services/HeliusWebhookService');
      const currentAddresses = await heliusWebhookService.getWebhookAddresses();
      
      // Add this new wallet to the webhook
      if (!currentAddresses.includes(publicKey)) {
        await heliusWebhookService.addWalletAddresses([publicKey]);
        console.log('[WalletModel] Added wallet to Helius webhook monitoring:', publicKey);
      }
    } catch (error) {
      console.error('[WalletModel] Failed to add wallet to Helius webhook:', error);
      // Don't fail wallet creation if webhook fails
    }

    return wallet;
  }

  static async importWallet(data: ImportWalletData): Promise<Wallet> {
    const id = uuidv4();
    
    // Validate the private key
    try {
      const keypair = Keypair.fromSecretKey(bs58.decode(data.privateKey));
      const publicKey = keypair.publicKey.toString();
      const encryptedPrivateKey = this.encrypt(data.privateKey);

      const wallet: Wallet = {
        id,
        user_id: data.userId,
        public_key: publicKey,
        encrypted_private_key: encryptedPrivateKey,
        is_imported: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from(TABLES.WALLETS)
        .insert([wallet]);

      if (error) {
        throw new Error(`Failed to import wallet: ${error.message}`);
      }

      return wallet;
    } catch (error) {
      throw new Error('Invalid private key format');
    }
  }

  static async findByUserId(userId: string): Promise<Wallet[]> {
    const { data, error } = await supabase
      .from(TABLES.WALLETS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find wallets: ${error.message}`);
    }

    return data || [];
  }

  static async findById(id: string): Promise<Wallet | null> {
    const { data, error } = await supabase
      .from(TABLES.WALLETS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No wallet found
      }
      throw new Error(`Failed to find wallet: ${error.message}`);
    }

    return data;
  }

  static async getPrivateKey(walletId: string): Promise<string> {
    const wallet = await this.findById(walletId);
    if (!wallet) throw new Error('Wallet not found');
    
    return this.decrypt(wallet.encrypted_private_key);
  }

  static async getKeypair(walletId: string): Promise<Keypair> {
    const privateKey = await this.getPrivateKey(walletId);
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  }
}
