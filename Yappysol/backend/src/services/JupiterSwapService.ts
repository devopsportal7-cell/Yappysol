import { Connection, VersionedTransaction } from '@solana/web3.js';
import { httpClient } from '../lib/httpClient';
import { JUP_PRO_QUOTE, JUP_LITE_QUOTE, JUP_SWAP_URL } from '../constants/jupiter';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;  // in lamports
  slippageBps?: number;
  onlyDirectRoutes?: boolean;
  asLegacyTransaction?: boolean;
}

export interface JupiterQuoteResponse {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
  contextSlot: number;
  timeTaken: number;
}

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
   * Get a quote for a swap using Jupiter v1 API with fallback
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50,
      onlyDirectRoutes = false,
      asLegacyTransaction = false
    } = params;

    const qs = new URLSearchParams({
      inputMint,
      outputMint,
      inAmount: String(amount),
      slippageBps: String(slippageBps),
      onlyDirectRoutes: String(onlyDirectRoutes),
      asLegacyTransaction: String(asLegacyTransaction),
    });

    // Try Pro endpoint first, fallback to Lite
    try {
      console.log('[JupiterSwapService] Requesting quote from Jupiter Pro...');
      const response = await httpClient.get(`${JUP_PRO_QUOTE}?${qs.toString()}`);
      
      if (response.status !== 200) {
        throw new Error(`Jupiter Pro API error: ${response.status}`);
      }

      const quote: JupiterQuoteResponse = response.data;
      
      console.log('[JupiterSwapService] Quote received from Pro:', {
        inputMint,
        outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      });

      return quote;
    } catch (error: any) {
      console.warn('[JupiterSwapService] Pro endpoint failed, trying Lite...', error.message);
      
      // Fallback to Lite endpoint
      try {
        const response = await httpClient.get(`${JUP_LITE_QUOTE}?${qs.toString()}`);
        
        if (response.status !== 200) {
          throw new Error(`Jupiter Lite API error: ${response.status}`);
        }

        const quote: JupiterQuoteResponse = response.data;
        
        console.log('[JupiterSwapService] Quote received from Lite:', {
          inputMint,
          outputMint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct
        });

        return quote;
      } catch (liteError: any) {
        console.error('[JupiterSwapService] Both Pro and Lite endpoints failed');
        throw new Error(`Jupiter API unavailable: ${liteError.message}`);
      }
    }
  }

  /**
   * Get swap transaction
   */
  async getSwapTransaction(params: JupiterSwapParams): Promise<string> {
    const {
      userPublicKey,
      inputMint,
      outputMint,
      amount,
      slippageBps = 50,
      priorityLevelWithMaxLamports
    } = params;

    try {
      // First get quote
      const quote = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false
      });

      // Now get swap transaction
      const swapParams = {
        quoteResponse: quote,
        userPublicKey,
        wrapUnwrapSOL: true,
        computeUnitPriceMicroLamports: priorityLevelWithMaxLamports?.maxLamports || undefined,
        prioritizationFeeLamports: undefined,
        asLegacyTransaction: false
      };

      const response = await httpClient.post(JUP_SWAP_URL, swapParams, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.status !== 200) {
        throw new Error(`Jupiter swap API error: ${response.status}`);
      }

      const { swapTransaction } = response.data;
      
      console.log('[JupiterSwapService] Swap transaction received');
      
      return swapTransaction;
    } catch (error: any) {
      console.error('[JupiterSwapService] Error getting swap transaction:', error);
      throw error;
    }
  }

  /**
   * Perform a complete swap (sign and send)
   */
  async performSwap(
    keypair: any,
    params: JupiterSwapParams
  ): Promise<string> {
    try {
      // Get the swap transaction
      const swapTransactionBase64 = await this.getSwapTransaction(params);

      // Decode and sign the transaction
      const transactionBytes = Uint8Array.from(atob(swapTransactionBase64), c => c.charCodeAt(0));
      const transaction = VersionedTransaction.deserialize(transactionBytes);
      
      // Sign with keypair
      transaction.sign([keypair]);

      // Send to network
      const connection = new Connection('https://api.mainnet-beta.solana.com');
      const signature = await connection.sendRawTransaction(
        transaction.serialize(),
        { skipPreflight: false }
      );

      console.log('[JupiterSwapService] ✅ Swap transaction signed and submitted:', signature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(signature, 'confirmed');

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
      }

      return signature;
    } catch (error: any) {
      console.error('[JupiterSwapService] Error performing swap:', error);
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
