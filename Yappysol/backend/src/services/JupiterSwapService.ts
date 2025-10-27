import { Connection, VersionedTransaction } from '@solana/web3.js';
import { performUltraSwap } from './jupiter/ultraSwap';

export interface JupiterSwapParams {
  userPublicKey: string;
  inputMint: string;
  outputMint: string;
  amount: number;  // in lamports
  slippageBps?: number;
  priorityLevelWithMaxLamports?: {
    maxLamports?: number;
    priorityLevel?: 'low' | 'medium' | 'high';
  };
}

export class JupiterSwapService {
  /**
   * Perform a complete swap using Jupiter Ultra Swap API
   */
  async performSwap(
    keypair: any,
    params: JupiterSwapParams
  ): Promise<string> {
    try {
      const {
        userPublicKey,
        inputMint,
        outputMint,
        amount,
        slippageBps = 50,
      } = params;

      console.log('[JupiterSwapService] Starting Ultra Swap', {
        inputMint,
        outputMint,
        amount,
        slippageBps,
        userPublicKey: `${userPublicKey.slice(0, 8)}...${userPublicKey.slice(-8)}`
      });

      // Use Ultra Swap API
      const signature = await performUltraSwap(keypair, {
        userPublicKey,
        inputMint,
        outputMint,
        amount,
        slippageBps,
      });

      console.log('[JupiterSwapService] ✅ Swap successful:', signature);
      return signature;
    } catch (error: any) {
      console.error('[JupiterSwapService] Error performing swap:', {
        error: error.message,
        stack: error.stack,
        params: {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          amount: params.amount
        }
      });
      throw error;
    }
  }

  /**
   * Convert lamports to human-readable amount
   */
  lamportsToAmount(lamports: string, decimals: number = 9): number {
    return parseFloat(lamports) / Math.pow(10, decimals);
  }

  /**
   * Convert amount to lamports
   */
  amountToLamports(amount: number, decimals: number = 9): number {
    return Math.floor(amount * Math.pow(10, decimals));
  }
}

export const jupiterSwapService = new JupiterSwapService();
