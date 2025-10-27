import { Connection, VersionedTransaction } from '@solana/web3.js';
import { getQuote } from './jupiter/quote';
import { postSwap } from './jupiter/swap';

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
   * Perform a complete swap (quote + swap + sign + send)
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
        priorityLevelWithMaxLamports
      } = params;

      console.log('[JupiterSwapService] Starting swap', {
        inputMint,
        outputMint,
        amount,
        slippageBps,
        userPublicKey: `${userPublicKey.slice(0, 8)}...${userPublicKey.slice(-8)}`
      });

      // Step 1: Get quote
      const quoteResult = await getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        swapMode: 'ExactIn',
        onlyDirectRoutes: false,
      });

      console.log('[JupiterSwapService] Quote received from', quoteResult.source);

      // Step 2: Get swap transaction
      const swapResult = await postSwap(quoteResult, userPublicKey);

      console.log('[JupiterSwapService] Swap transaction received from', swapResult.source);

      // Step 3: Decode and sign the transaction
      const transactionBytes = Uint8Array.from(atob(swapResult.swapTransaction), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBytes);
      
      // Sign with keypair
      transaction.sign([keypair]);

      // Step 4: Submit to network
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );

      console.log('[JupiterSwapService] ✅ Transaction submitted:', signature);

      // Step 5: Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

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
