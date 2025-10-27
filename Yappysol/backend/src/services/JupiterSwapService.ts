import { Connection, VersionedTransaction } from '@solana/web3.js';
import { httpClient } from '../lib/httpClient';
import { JUP_PRO_QUOTE, JUP_LITE_QUOTE, JUP_V6_QUOTE, JUP_SWAP_URL } from '../constants/jupiter';

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

/**
 * Helper to unwrap Axios errors
 */
function unwrapAxiosError(e: any) {
  return {
    status: e?.response?.status,
    data: e?.response?.data,
    message: e?.message ?? String(e),
    code: e?.code,
  };
}

export class JupiterSwapService {
  /**
   * Build query string for Jupiter API
   */
  private buildQueryString(params: JupiterQuoteParams): string {
    const qs = new URLSearchParams({
      inputMint: params.inputMint,
      outputMint: params.outputMint,
      amount: String(params.amount), // ✅ Correct param name for Jupiter
      slippageBps: String(params.slippageBps || 50),
      onlyDirectRoutes: String(params.onlyDirectRoutes || false),
      asLegacyTransaction: String(params.asLegacyTransaction || false),
    });
    return qs.toString();
  }

  /**
   * Get a quote for a swap using Jupiter v1 API with multiple fallbacks
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse & { source: string }> {
    // Validate inputs
    if (!params.inputMint || !params.outputMint) {
      throw new Error('Missing input/output mint');
    }
    if (!params.amount || params.amount <= 0) {
      throw new Error('Amount must be greater than zero');
    }

    const qs = this.buildQueryString(params);
    const headers = {
      'Accept': 'application/json',
      'User-Agent': 'yappysol-backend/1.0',
    };

    // Try Pro endpoint first
    try {
      console.log('[JupiterSwapService] Requesting quote from Jupiter Pro...');
      const response = await httpClient.get(`${JUP_PRO_QUOTE}?${qs}`, {
        headers,
        timeout: 10_000,
      });
      
      if (response.status !== 200) {
        throw new Error(`Jupiter Pro API returned ${response.status}`);
      }

      const quote: JupiterQuoteResponse = response.data;
      
      console.log('[JupiterSwapService] ✅ Quote received from Pro v1:', {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      });

      return { ...quote, source: 'pro-v1' };
    } catch (e1) {
      const err1 = unwrapAxiosError(e1);
      console.warn('[JupiterSwapService] Pro v1 failed:', err1);

      // Fallback to Lite endpoint
      try {
        console.log('[JupiterSwapService] Requesting quote from Jupiter Lite...');
        const response = await httpClient.get(`${JUP_LITE_QUOTE}?${qs}`, {
          headers,
          timeout: 10_000,
        });
        
        if (response.status !== 200) {
          throw new Error(`Jupiter Lite API returned ${response.status}`);
        }

        const quote: JupiterQuoteResponse = response.data;
        
        console.log('[JupiterSwapService] ✅ Quote received from Lite v1:', {
          inputMint: params.inputMint,
          outputMint: params.outputMint,
          inAmount: quote.inAmount,
          outAmount: quote.outAmount,
          priceImpact: quote.priceImpactPct
        });

        return { ...quote, source: 'lite-v1' };
      } catch (e2) {
        const err2 = unwrapAxiosError(e2);
        console.warn('[JupiterSwapService] Lite v1 failed:', err2);

        // Final fallback to v6
        try {
          console.log('[JupiterSwapService] Requesting quote from Jupiter v6 (legacy)...');
          const response = await httpClient.get(`${JUP_V6_QUOTE}?${qs}`, {
            headers,
            timeout: 10_000,
          });
          
          if (response.status !== 200) {
            throw new Error(`Jupiter v6 API returned ${response.status}`);
          }

          const quote: JupiterQuoteResponse = response.data;
          
          console.log('[JupiterSwapService] ✅ Quote received from v6 legacy:', {
            inputMint: params.inputMint,
            outputMint: params.outputMint,
            inAmount: quote.inAmount,
            outAmount: quote.outAmount,
            priceImpact: quote.priceImpactPct
          });

          return { ...quote, source: 'v6' };
        } catch (e3) {
          const err3 = unwrapAxiosError(e3);
          console.error('[JupiterSwapService] ❌ All Jupiter endpoints failed:', {
            pro: err1,
            lite: err2,
            v6: err3
          });
          throw new Error(`All Jupiter endpoints failed. Last error: ${err3.status ?? ''} ${err3.message}`);
        }
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
      const quoteResult = await this.getQuote({
        inputMint,
        outputMint,
        amount,
        slippageBps,
        onlyDirectRoutes: false,
        asLegacyTransaction: false
      });

      const quote = quoteResult as JupiterQuoteResponse;
      console.log(`[JupiterSwapService] Got quote from ${quoteResult.source}`);

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
        },
        timeout: 10_000
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
