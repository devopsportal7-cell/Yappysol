import axios from 'axios';
import { Keypair, Transaction, VersionedTransaction, Connection } from '@solana/web3.js';

/**
 * Jupiter Ultra Swap API Service
 * Uses the new Ultra Swap API which is RPC-less and handles everything
 * Documentation: https://dev.jup.ag/docs/ultra
 */
export interface UltraOrderParams {
  userPublicKey: string;
  inputMint: string;
  outputMint: string;
  amount: number; // in lamports
  slippageBps?: number;
}

export interface UltraOrderResponse {
  orderId: string;
  executionUrl: string;
  estimatedOutput: string;
  feeInformation?: {
    integratorFee?: string;
    platformFee?: string;
  };
}

export interface UltraExecuteResponse {
  orderId: string;
  status: 'success' | 'pending' | 'failed';
  transactionSignature?: string;
  error?: string;
  outputAmount?: string;
}

export class JupiterUltraSwapService {
  // Jupiter API v6 endpoints
  private readonly quoteUrl = 'https://quote-api.jup.ag/v6/quote';
  private readonly swapUrl = 'https://quote-api.jup.ag/v6/swap';
  
  // Fallback base URL in case of DNS issues
  private readonly heliusRpcUrl = process.env.HELIUS_RPC_URL || 'https://mainnet.helius-rpc.com/?api-key=';

  /**
   * Get a quote for a swap using Jupiter v6 API
   */
  async getQuote(params: UltraOrderParams): Promise<any> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50
    } = params;

    try {
      console.log('[JupiterUltraSwap] Getting quote:', {
        inputMint,
        outputMint,
        amount,
        slippageBps
      });

      const url = new URL(this.quoteUrl);
      url.searchParams.append('inputMint', inputMint);
      url.searchParams.append('outputMint', outputMint);
      url.searchParams.append('amount', amount.toString());
      url.searchParams.append('slippageBps', slippageBps.toString());
      url.searchParams.append('onlyDirectRoutes', 'false');
      url.searchParams.append('asLegacyTransaction', 'false');

      const response = await axios.get(url.toString());

      if (response.status !== 200) {
        throw new Error(`Jupiter quote API error: ${response.status}`);
      }

      const quote = response.data;
      console.log('[JupiterUltraSwap] Quote received:', {
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      });

      return quote;
    } catch (error: any) {
      console.error('[JupiterUltraSwap] Error getting quote:', {
        error: error.message,
        params
      });
      throw error;
    }
  }

  /**
   * Get swap transaction from Jupiter
   */
  async getSwapTransaction(
    keypair: Keypair,
    params: UltraOrderParams
  ): Promise<string> {
    try {
      console.log('[JupiterUltraSwap] Getting swap transaction:', params);

      // Step 1: Get quote
      const quote = await this.getQuote(params);

      // Step 2: Get swap transaction
      const swapParams = {
        quoteResponse: quote,
        userPublicKey: keypair.publicKey.toString(),
        wrapUnwrapSOL: true,
        asLegacyTransaction: false
      };

      const response = await axios.post(this.swapUrl, swapParams, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Jupiter swap API error: ${response.status}`);
      }

      const { swapTransaction } = response.data;
      console.log('[JupiterUltraSwap] Swap transaction received');

      return swapTransaction;
    } catch (error: any) {
      console.error('[JupiterUltraSwap] Error getting swap transaction:', {
        error: error.message,
        params
      });
      throw error;
    }
  }

  /**
   * Perform complete swap using Jupiter v6 API
   * This is the main method to call
   */
  async performSwap(
    keypair: Keypair,
    params: UltraOrderParams
  ): Promise<string> {
    try {
      console.log('[JupiterUltraSwap] Performing swap...', params);

      // Step 1: Get swap transaction
      const swapTransactionBase64 = await this.getSwapTransaction(keypair, params);

      // Step 2: Decode and sign the transaction
      const transactionBytes = Uint8Array.from(
        atob(swapTransactionBase64),
        c => c.charCodeAt(0)
      );

      let transaction: VersionedTransaction;
      try {
        transaction = VersionedTransaction.deserialize(transactionBytes);
      } catch (e) {
        throw new Error('Failed to deserialize transaction');
      }

      // Sign with keypair
      transaction.sign([keypair]);

      // Step 3: Submit signed transaction to network
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        {
          skipPreflight: false,
          maxRetries: 3
        }
      );

      console.log('[JupiterUltraSwap] Transaction submitted:', signature);

      // Step 4: Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        signature,
        'confirmed'
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      console.log('[JupiterUltraSwap] ✅ Swap successful:', signature);
      return signature;
    } catch (error: any) {
      console.error('[JupiterUltraSwap] Error performing swap:', {
        error: error.message,
        stack: error.stack,
        params
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

export const jupiterUltraSwapService = new JupiterUltraSwapService();

