import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletModel } from '../models/WalletSupabase';
import { UserModel } from '../models/UserSupabase';
import bs58 from 'bs58';

export interface WalletInfo {
  id: string;
  publicKey: string;
  balance: number;
  isImported: boolean;
  isDefault: boolean;
}

export interface TransactionFees {
  networkFee: number;
  priorityFee: number;
  totalFee: number;
  estimatedCost: number;
}

export class WalletService {
  private static readonly RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || "https://api.mainnet-beta.solana.com";
  private static readonly connection = new Connection(this.RPC_ENDPOINT, 'confirmed');

  /**
   * Get user's default wallet for transactions
   */
  static async getUserDefaultWallet(userId: string): Promise<WalletInfo | null> {
    try {
      const wallets = await WalletModel.findByUserId(userId);
      if (wallets.length === 0) {
        return null;
      }

      // Find the first non-imported wallet (generated wallet) as default
      const defaultWallet = wallets.find(w => !w.is_imported) || wallets[0];
      
      const balance = await this.getWalletBalance(defaultWallet.public_key);
      
      return {
        id: defaultWallet.id,
        publicKey: defaultWallet.public_key,
        balance,
        isImported: defaultWallet.is_imported,
        isDefault: !defaultWallet.is_imported
      };
    } catch (error) {
      console.error('Error getting user default wallet:', error);
      return null;
    }
  }

  /**
   * Get all user wallets with balances
   */
  static async getUserWallets(userId: string): Promise<WalletInfo[]> {
    try {
      console.log('[WalletService] Getting wallets for userId:', userId);
      const wallets = await WalletModel.findByUserId(userId);
      console.log('[WalletService] Raw wallets from DB:', JSON.stringify(wallets, null, 2));
      
      if (wallets.length === 0) {
        console.log('[WalletService] No wallets found for user');
        return [];
      }
      
      const walletsWithBalance = await Promise.all(
        wallets.map(async (wallet) => {
          console.log('[WalletService] Processing wallet:', wallet.id, 'publicKey:', wallet.public_key);
          const balance = await this.getWalletBalance(wallet.public_key);
          const walletInfo = {
            id: wallet.id,
            publicKey: wallet.public_key,
            balance,
            isImported: wallet.is_imported,
            isDefault: !wallet.is_imported
          };
          console.log('[WalletService] Created wallet info:', JSON.stringify(walletInfo, null, 2));
          return walletInfo;
        })
      );

      console.log('[WalletService] Final wallets with balance:', JSON.stringify(walletsWithBalance, null, 2));
      return walletsWithBalance;
    } catch (error) {
      console.error('Error getting user wallets:', error);
      return [];
    }
  }

  /**
   * Get wallet balance in SOL
   */
  static async getWalletBalance(publicKey: string): Promise<number> {
    try {
      const pubKey = new PublicKey(publicKey);
      const balance = await this.connection.getBalance(pubKey);
      return balance / LAMPORTS_PER_SOL;
    } catch (error) {
      console.error('Error getting wallet balance:', error);
      return 0;
    }
  }

  /**
   * Get wallet keypair for signing transactions
   */
  static async getWalletKeypair(walletId: string): Promise<Keypair> {
    try {
      return await WalletModel.getKeypair(walletId);
    } catch (error) {
      console.error('Error getting wallet keypair:', error);
      throw new Error('Failed to get wallet keypair');
    }
  }

  /**
   * Check if wallet has sufficient balance for transaction
   */
  static async hasSufficientBalance(
    walletId: string, 
    requiredAmount: number, 
    fees: TransactionFees
  ): Promise<{ sufficient: boolean; currentBalance: number; required: number; shortfall?: number }> {
    try {
      const wallet = await WalletModel.findById(walletId);
      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const balance = await this.getWalletBalance(wallet.public_key);
      const totalRequired = requiredAmount + fees.totalFee;
      
      return {
        sufficient: balance >= totalRequired,
        currentBalance: balance,
        required: totalRequired,
        shortfall: balance < totalRequired ? totalRequired - balance : undefined
      };
    } catch (error) {
      console.error('Error checking wallet balance:', error);
      throw new Error('Failed to check wallet balance');
    }
  }

  /**
   * Calculate transaction fees
   */
  static calculateTransactionFees(
    transactionType: 'token-creation' | 'token-swap' | 'transfer',
    amount: number,
    priorityFee: number = 0.0005
  ): TransactionFees {
    const baseNetworkFee = 0.000005; // ~5000 lamports base fee
    const networkFee = baseNetworkFee;
    const totalFee = networkFee + priorityFee;
    
    // For token creation, add additional fees
    // Pump.fun requires ~0.015 SOL for dev buy + fees + rent exemption
    if (transactionType === 'token-creation') {
      // Safety buffer: token creation needs minimum 0.01 SOL for dev buy + ~0.005 for fees/rent
      const creationFee = Math.max(0.01 + 0.005, amount + 0.005); // Extra 0.005 SOL buffer for rent and fees
      return {
        networkFee: networkFee + 0.002, // Base network fee
        priorityFee,
        totalFee: totalFee + 0.002,
        estimatedCost: creationFee // Use higher of minimum or requested amount + buffer
      };
    }

    return {
      networkFee,
      priorityFee,
      totalFee,
      estimatedCost: amount + totalFee
    };
  }

  /**
   * Validate wallet for transaction
   */
  static async validateWalletForTransaction(
    userId: string,
    walletId: string,
    transactionType: 'token-creation' | 'token-swap' | 'transfer',
    amount: number
  ): Promise<{ valid: boolean; wallet?: WalletInfo; fees?: TransactionFees; error?: string }> {
    try {
      // Check if wallet belongs to user
      const wallets = await WalletModel.findByUserId(userId);
      const wallet = wallets.find(w => w.id === walletId);
      
      if (!wallet) {
        return { valid: false, error: 'Wallet not found or does not belong to user' };
      }

      // Calculate fees
      const fees = this.calculateTransactionFees(transactionType, amount);
      
      // Check balance
      const balanceCheck = await this.hasSufficientBalance(walletId, amount, fees);
      
      if (!balanceCheck.sufficient) {
        return { 
          valid: false, 
          error: `Insufficient balance. Need ${balanceCheck.required.toFixed(6)} SOL, have ${balanceCheck.currentBalance.toFixed(6)} SOL`,
          fees
        };
      }

      const walletInfo: WalletInfo = {
        id: wallet.id,
        publicKey: wallet.public_key,
        balance: balanceCheck.currentBalance,
        isImported: wallet.is_imported,
        isDefault: !wallet.is_imported
      };

      return { valid: true, wallet: walletInfo, fees };
    } catch (error) {
      console.error('Error validating wallet:', error);
      return { valid: false, error: 'Failed to validate wallet' };
    }
  }

  /**
   * Get transaction summary for user
   */
  static async getTransactionSummary(
    userId: string,
    transactionType: 'token-creation' | 'token-swap' | 'transfer',
    amount: number,
    walletId?: string
  ): Promise<{ wallet: WalletInfo; fees: TransactionFees; totalCost: number } | null> {
    try {
      // Use provided wallet or default wallet
      const targetWalletId = walletId || (await this.getUserDefaultWallet(userId))?.id;
      
      if (!targetWalletId) {
        return null;
      }

      const validation = await this.validateWalletForTransaction(userId, targetWalletId, transactionType, amount);
      
      if (!validation.valid || !validation.wallet || !validation.fees) {
        return null;
      }

      return {
        wallet: validation.wallet,
        fees: validation.fees,
        totalCost: validation.fees.estimatedCost
      };
    } catch (error) {
      console.error('Error getting transaction summary:', error);
      return null;
    }
  }
}
