import fetch from 'node-fetch';
import { Connection, VersionedTransaction, Transaction } from '@solana/web3.js';

export interface JupiterQuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number;
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
  amount: number;
  slippageBps?: number;
  priorityLevelWithMaxLamports?: {
    maxLamports?: number;
    priorityLevel?: 'low' | 'medium' | 'high';
  };
}

export class JupiterSwapService {
  private readonly baseUrl = 'https://quote-api.jup.ag/v6';
  private readonly swapUrl = 'https://quote-api.jup.ag/v6/swap';

  /**
   * Get a quote for a swap
   */
  async getQuote(params: JupiterQuoteParams): Promise<JupiterQuoteResponse> {
    const {
      inputMint,
      outputMint,
      amount,
      slippageBps = 50, // 0.5% default slippage
      onlyDirectRoutes = false,
      asLegacyTransaction = false
    } = params;

    const url = new URL('/quote', this.baseUrl);
    url.searchParams.append('inputMint', inputMint);
    url.searchParams.append('outputMint', outputMint);
    url.searchParams.append('amount', amount.toString());
    url.searchParams.append('slippageBps', slippageBps.toString());
    url.searchParams.append('onlyDirectRoutes', onlyDirectRoutes.toString());
    url.searchParams.append('asLegacyTransaction', asLegacyTransaction.toString());

    try {
      const response = await fetch(url.toString());
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter quote API error: ${response.status} - ${errorText}`);
      }

      const quote: JupiterQuoteResponse = await response.json();
      
      // Log quote for debugging
      console.log('[JupiterSwapService] Quote received:', {
        inputMint,
        outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        priceImpact: quote.priceImpactPct
      });

      return quote;
    } catch (error: any) {
      console.error('[JupiterSwapService] Error getting quote:', error);
      throw error;
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

      const response = await fetch(this.swapUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(swapParams)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Jupiter swap API error: ${response.status} - ${errorText}`);
      }

      const { swapTransaction } = await response.json();
      
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

