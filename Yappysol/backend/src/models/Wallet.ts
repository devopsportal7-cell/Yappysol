import { v4 as uuidv4 } from 'uuid';
import { Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import crypto from 'crypto';
import { FileStorage } from '../utils/fileStorage';

export interface Wallet {
  id: string;
  userId: string;
  publicKey: string;
  encryptedPrivateKey: string;
  isImported: boolean;
  createdAt: Date;
  updatedAt: Date;
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
  private static wallets: FileStorage<Wallet> = new FileStorage<Wallet>('wallets');
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
      userId: data.userId,
      publicKey,
      encryptedPrivateKey,
      isImported: data.isImported || false,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.wallets.set(id, wallet);
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
        userId: data.userId,
        publicKey,
        encryptedPrivateKey,
        isImported: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.wallets.set(id, wallet);
      return wallet;
    } catch (error) {
      throw new Error('Invalid private key format');
    }
  }

  static async findByUserId(userId: string): Promise<Wallet[]> {
    const userWallets: Wallet[] = [];
    for (const wallet of this.wallets.values()) {
      if (wallet.userId === userId) {
        userWallets.push(wallet);
      }
    }
    return userWallets;
  }

  static async findById(id: string): Promise<Wallet | null> {
    return this.wallets.get(id) || null;
  }

  static async getPrivateKey(walletId: string): Promise<string> {
    const wallet = this.wallets.get(walletId);
    if (!wallet) throw new Error('Wallet not found');
    
    return this.decrypt(wallet.encryptedPrivateKey);
  }

  static async getKeypair(walletId: string): Promise<Keypair> {
    const privateKey = await this.getPrivateKey(walletId);
    return Keypair.fromSecretKey(bs58.decode(privateKey));
  }
}