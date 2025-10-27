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
  private readonly ultraOrderUrl = 'https://api.jup.ag/ultra/order';
  private readonly ultraExecuteUrl = 'https://api.jup.ag/ultra/execute';

  /**
   * Create an order for a swap
   * POST /order endpoint
   * Docs: https://dev.jup.ag/docs/ultra/get-order
   */
  async createOrder(params: UltraOrderParams): Promise<UltraOrderResponse> {
    const {
      userPublicKey,
      inputMint,
      outputMint,
      amount,
      slippageBps = 50 // 0.5% default
    } = params;

    try {
      console.log('[JupiterUltraSwap] Creating order:', {
        userPublicKey,
        inputMint,
        outputMint,
        amount,
        slippageBps
      });

      const response = await axios.post(
        this.ultraOrderUrl,
        {
          userPublicKey,
          inputMint,
          outputMint,
          amount,
          slippageBps
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Jupiter Ultra API error: ${response.status}`);
      }

      const orderData = response.data;
      console.log('[JupiterUltraSwap] Order created:', orderData.orderId);

      return orderData;
    } catch (error: any) {
      console.error('[JupiterUltraSwap] Error creating order:', {
        error: error.message,
        stack: error.stack,
        params
      });
      throw error;
    }
  }

  /**
   * Execute an order (get unsigned tx, sign, and submit)
   * POST /execute endpoint
   * Docs: https://dev.jup.ag/docs/ultra/execute-order
   */
  async executeOrder(
    orderId: string,
    keypair: Keypair
  ): Promise<UltraExecuteResponse> {
    try {
      console.log('[JupiterUltraSwap] Executing order:', orderId);

      // Step 1: Get unsigned transaction from Jupiter
      const response = await axios.post(
        `${this.ultraExecuteUrl}/${orderId}`,
        {
          publicKey: keypair.publicKey.toString()
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.status !== 200) {
        throw new Error(`Jupiter Ultra Execute API error: ${response.status}`);
      }

      const executeData = response.data;
      console.log('[JupiterUltraSwap] Got unsigned transaction:', executeData);

      // Step 2: Sign the transaction with keypair
      if (!executeData.transaction) {
        throw new Error('No transaction data returned from Jupiter');
      }

      const transactionBytes = Uint8Array.from(
        atob(executeData.transaction),
        c => c.charCodeAt(0)
      );

      // Deserialize and sign (handle both legacy and versioned transactions)
      let transaction: Transaction | VersionedTransaction;
      let isVersioned = false;
      
      try {
        // Try as VersionedTransaction first
        transaction = VersionedTransaction.deserialize(transactionBytes);
        isVersioned = true;
        transaction.sign([keypair]);
      } catch (e) {
        // Fall back to legacy Transaction
        transaction = Transaction.from(transactionBytes);
        transaction.sign(keypair);
      }

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

      return {
        orderId,
        status: 'success',
        transactionSignature: signature
      };
    } catch (error: any) {
      console.error('[JupiterUltraSwap] Error executing order:', {
        error: error.message,
        stack: error.stack,
        orderId
      });
      throw error;
    }
  }

  /**
   * Perform complete swap using Ultra API
   * This is the main method to call
   */
  async performSwap(
    keypair: Keypair,
    params: UltraOrderParams
  ): Promise<string> {
    try {
      // Step 1: Create order
      console.log('[JupiterUltraSwap] Creating swap order...');
      const order = await this.createOrder({
        ...params,
        userPublicKey: keypair.publicKey.toString()
      });

      // Step 2: Execute order (signs and submits)
      console.log('[JupiterUltraSwap] Executing order...');
      const result = await this.executeOrder(order.orderId, keypair);

      if (result.status !== 'success') {
        throw new Error(`Swap failed: ${result.error || 'Unknown error'}`);
      }

      if (!result.transactionSignature) {
        throw new Error('No transaction signature returned');
      }

      console.log('[JupiterUltraSwap] ✅ Swap successful:', result.transactionSignature);
      return result.transactionSignature;
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

