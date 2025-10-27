import { httpClient } from '../../lib/httpClient';
import { JUP_ULTRA_ORDER, JUP_ULTRA_EXECUTE, getJupiterHeaders } from './constants';
import { Connection, VersionedTransaction, Keypair } from '@solana/web3.js';

export interface UltraOrderParams {
  userPublicKey: string;
  inputMint: string;
  outputMint: string;
  amount: number; // in smallest units (lamports for SOL)
  slippageBps?: number;
}

export interface UltraOrderResponse {
  orderId: string;
  transaction: string; // base64 encoded transaction
  estimatedOutput?: string;
}

export interface UltraExecuteParams {
  orderId: string;
  publicKey: string; // user's public key for signing
}

export interface UltraExecuteResponse {
  orderId: string;
  status: 'success' | 'pending' | 'failed';
  transactionSignature?: string;
  error?: string;
}

function unwrapAxiosError(e: any) {
  return {
    status: e?.response?.status,
    data: e?.response?.data,
    message: e?.message ?? String(e),
    code: e?.code,
  };
}

/**
 * Create an Ultra order (quote + transaction in one call)
 */
export async function createUltraOrder(params: UltraOrderParams): Promise<UltraOrderResponse> {
  const {
    userPublicKey,
    inputMint,
    outputMint,
    amount,
    slippageBps = 50,
  } = params;

  console.log('[Jupiter Ultra] Creating order', {
    inputMint,
    outputMint,
    amount,
    slippageBps,
    userPublicKey: `${userPublicKey.slice(0, 8)}...${userPublicKey.slice(-8)}`
  });

  try {
    const response = await httpClient.post(
      JUP_ULTRA_ORDER,
      {
        userPublicKey,
        inputMint,
        outputMint,
        amount,
        slippageBps,
      },
      {
        headers: getJupiterHeaders(),
        timeout: 15_000,
      }
    );

    if (response.status === 200 && response.data?.orderId) {
      console.log('[Jupiter Ultra] ✅ Order created:', response.data.orderId);
      return response.data;
    }

    throw new Error(`Ultra order returned status ${response.status}`);
  } catch (e: any) {
    const err = unwrapAxiosError(e);
    console.error('[Jupiter Ultra] Order creation failed:', err);
    throw new Error(`Failed to create Ultra order: ${err.status || err.message}`);
  }
}

/**
 * Execute an Ultra order (returns unsigned transaction for signing)
 */
export async function executeUltraOrder(
  orderId: string,
  keypair: Keypair
): Promise<string> {
  console.log('[Jupiter Ultra] Executing order:', orderId);

  try {
    // Step 1: Get unsigned transaction
    const response = await httpClient.post(
      `${JUP_ULTRA_EXECUTE}/${orderId}`,
      {
        publicKey: keypair.publicKey.toString()
      },
      {
        headers: getJupiterHeaders(),
        timeout: 15_000,
      }
    );

    if (response.status !== 200 || !response.data?.transaction) {
      throw new Error(`Ultra execute returned status ${response.status} or missing transaction`);
    }

    const unsignedTxBase64 = response.data.transaction;
    console.log('[Jupiter Ultra] Got unsigned transaction');

    // Step 2: Decode and sign the transaction
    const transactionBytes = Uint8Array.from(atob(unsignedTxBase64), c => c.charCodeAt(0));
    const transaction = VersionedTransaction.deserialize(transactionBytes);
    
    // Sign with keypair
    transaction.sign([keypair]);

    // Step 3: Submit to network
    const connection = new Connection('https://api.mainnet-beta.solana.com');
    const signature = await connection.sendRawTransaction(
      transaction.serialize(),
      { skipPreflight: false }
    );

    console.log('[Jupiter Ultra] Transaction submitted:', signature);

    // Step 4: Wait for confirmation
    const confirmation = await connection.confirmTransaction(signature, 'confirmed');

    if (confirmation.value.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
    }

    console.log('[Jupiter Ultra] ✅ Swap successful:', signature);
    return signature;
  } catch (e: any) {
    const err = unwrapAxiosError(e);
    console.error('[Jupiter Ultra] Order execution failed:', err);
    throw new Error(`Failed to execute Ultra order: ${err.status || err.message}`);
  }
}

/**
 * Complete Ultra swap flow (order + execute + sign + send)
 */
export async function performUltraSwap(
  keypair: Keypair,
  params: UltraOrderParams
): Promise<string> {
  try {
    // Step 1: Create order (quote + tx)
    const order = await createUltraOrder(params);

    // Step 2: Execute order (sign and send)
    const signature = await executeUltraOrder(order.orderId, keypair);

    return signature;
  } catch (error: any) {
    console.error('[Jupiter Ultra] Swap failed:', {
      error: error.message,
      params: {
        inputMint: params.inputMint,
        outputMint: params.outputMint,
        amount: params.amount
      }
    });
    throw error;
  }
}

