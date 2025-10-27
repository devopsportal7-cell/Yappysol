import { httpClient } from '../lib/httpClient';
import { VersionedTransaction, Keypair } from '@solana/web3.js';
import { logger } from '../utils/logger';

/**
 * Solana Tracker Swap API Service
 * Documentation: https://docs.solanatracker.io/swap-api/swap
 * Free, no API key required
 */
export interface SolanaTrackerSwapParams {
  from: string;  // base token mint address
  to: string;    // quote token mint address
  fromAmount: number;  // amount to swap
  slippage: number;    // slippage percentage (0-100)
  payer: string;       // user's public key
  priorityFee?: number | 'auto';
  priorityFeeLevel?: 'min' | 'low' | 'medium' | 'high' | 'veryHigh' | 'unsafeMax';
  txVersion?: 'v0' | 'legacy';
  onlyDirectRoutes?: boolean;
  fee?: string;  // Custom fee: 'WALLET_ADDRESS:PERCENTAGE'
  feeType?: 'add' | 'deduct';
}

export interface SolanaTrackerSwapResponse {
  txn: string;  // Base64 encoded transaction
  rate: {
    amountIn: number;
    amountOut: number;
    minAmountOut: number;
    currentPrice: number;
    executionPrice: number;
    priceImpact: number;
    fee: number;
    platformFee: number;
    platformFeeUI: number;
    baseCurrency: {
      mint: string;
      decimals: number;
    };
    quoteCurrency: {
      mint: string;
      decimals: number;
    };
  };
  timeTaken: number;
  type: 'v0' | 'legacy';
}

export class SolanaTrackerSwapService {
  private readonly BASE_URL = 'https://swap-v2.solanatracker.io';

  /**
   * Get swap transaction from Solana Tracker
   */
  async getSwapTransaction(params: SolanaTrackerSwapParams): Promise<SolanaTrackerSwapResponse> {
    try {
      const queryParams = new URLSearchParams({
        from: params.from,
        to: params.to,
        fromAmount: String(params.fromAmount),
        slippage: String(params.slippage),
        payer: params.payer,
      });

      // Add optional parameters
      if (params.priorityFee !== undefined) {
        queryParams.append('priorityFee', String(params.priorityFee));
      }
      if (params.priorityFeeLevel) {
        queryParams.append('priorityFeeLevel', params.priorityFeeLevel);
      }
      if (params.txVersion) {
        queryParams.append('txVersion', params.txVersion);
      }
      if (params.onlyDirectRoutes !== undefined) {
        queryParams.append('onlyDirectRoutes', String(params.onlyDirectRoutes));
      }
      if (params.fee) {
        queryParams.append('fee', params.fee);
      }
      if (params.feeType) {
        queryParams.append('feeType', params.feeType);
      }

      const url = `${this.BASE_URL}/swap?${queryParams.toString()}`;
      
      logger.info('[SolanaTracker] Requesting swap transaction', {
        url,
        from: params.from.slice(0, 8) + '...',
        to: params.to.slice(0, 8) + '...',
        amount: params.fromAmount
      });

      const response = await httpClient.get(url, {
        headers: {
          'Accept': 'application/json',
        },
        timeout: 15_000,
      });

      if (response.status !== 200) {
        throw new Error(`Solana Tracker returned status ${response.status}`);
      }

      logger.info('[SolanaTracker] ✅ Swap transaction received', {
        type: response.data.type,
        amountOut: response.data.rate.amountOut,
        priceImpact: response.data.rate.priceImpact,
        timeTaken: response.data.timeTaken
      });

      return response.data;

    } catch (error: any) {
      logger.error('[SolanaTracker] Error getting swap transaction:', {
        error: error.message,
        params: {
          from: params.from,
          to: params.to,
          amount: params.fromAmount
        }
      });
      throw error;
    }
  }

  /**
   * Perform complete swap using Solana Tracker
   */
  async performSwap(keypair: Keypair, params: SolanaTrackerSwapParams): Promise<string> {
    try {
      // Step 1: Get unsigned transaction
      const swapResponse = await this.getSwapTransaction(params);

      logger.info('[SolanaTracker] Signing transaction...');

      // Step 2: Decode and sign the transaction
      const transactionBytes = Uint8Array.from(
        atob(swapResponse.txn),
        c => c.charCodeAt(0)
      );

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(transactionBytes);
      } catch (e) {
        throw new Error('Failed to deserialize transaction from Solana Tracker');
      }

      // Sign with user's keypair
      transaction.sign([keypair]);

      logger.info('[SolanaTracker] Transaction signed');

      // Step 3: Submit to network
      const { Connection } = await import('@solana/web3.js');
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );

      logger.info('[SolanaTracker] Transaction submitted:', signature);

      // Step 4: Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      logger.info('[SolanaTracker] ✅ Swap successful:', {
        signature,
        amountOut: swapResponse.rate.amountOut,
        platformFee: swapResponse.rate.platformFeeUI
      });

      return signature;

    } catch (error: any) {
      logger.error('[SolanaTracker] Error performing swap:', {
        error: error.message,
        params: {
          from: params.from,
          to: params.to,
          amount: params.fromAmount
        }
      });
      throw error;
    }
  }

  /**
   * Convert amount to lamports
   */
  amountToLamports(amount: number, decimals: number = 9): number {
    return Math.floor(amount * Math.pow(10, decimals));
  }

  /**
   * Convert lamports to human-readable amount
   */
  lamportsToAmount(lamports: number, decimals: number = 9): number {
    return lamports / Math.pow(10, decimals);
  }
}

export const solanaTrackerSwapService = new SolanaTrackerSwapService();

