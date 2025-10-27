import { httpClient } from '../../lib/httpClient';
import { JUP_ULTRA_ORDER, JUP_ULTRA_EXECUTE, getJupiterHeaders } from './constants';
import { VersionedTransaction, Keypair } from '@solana/web3.js';

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

  console.log('[Jupiter Ultra] Creating order with GET request', {
    inputMint,
    outputMint,
    amount,
    slippageBps,
    userPublicKey: `${userPublicKey.slice(0, 8)}...${userPublicKey.slice(-8)}`
  });

  try {
    // Build query string for GET request
    const queryParams = new URLSearchParams({
      inputMint,
      outputMint,
      amount: String(amount),
      taker: userPublicKey, // Required: the address that will sign
      slippageBps: String(slippageBps),
    });

    const url = `${JUP_ULTRA_ORDER}?${queryParams.toString()}`;
    
    const headers = getJupiterHeaders();
    console.log('[Jupiter Ultra] Requesting:', url);
    console.log('[Jupiter Ultra] Headers:', { ...headers, 'x-api-key': headers['x-api-key'] ? `${headers['x-api-key'].slice(0, 8)}...${headers['x-api-key'].slice(-4)}` : 'MISSING' });

    // Use GET request as per OpenAPI spec
    const response = await httpClient.get(url, {
      headers,
      timeout: 15_000,
    });

    if (response.status === 200 && response.data?.requestId) {
      console.log('[Jupiter Ultra] ✅ Order created:', {
        requestId: response.data.requestId,
        transaction: response.data.transaction ? 'present' : 'missing',
        router: response.data.router
      });
      
      return {
        orderId: response.data.requestId,
        transaction: response.data.transaction || '',
        estimatedOutput: response.data.outAmount,
      };
    }

    throw new Error(`Ultra order returned status ${response.status}`);
  } catch (e: any) {
    const err = unwrapAxiosError(e);
    console.error('[Jupiter Ultra] Order creation failed:', err);
    throw new Error(`Failed to create Ultra order: ${err.status || err.message}`);
  }
}

/**
 * Execute an Ultra order (POST signed transaction to /execute)
 */
export async function executeUltraOrder(
  requestId: string,
  signedTransactionBase64: string
): Promise<string> {
  console.log('[Jupiter Ultra] Executing order with signed transaction', { requestId });

  try {
    // POST signed transaction AND requestId to /execute
    const response = await httpClient.post(
      JUP_ULTRA_EXECUTE,
      {
        signedTransaction: signedTransactionBase64,
        requestId: requestId  // ✅ Required by API spec
      },
      {
        headers: getJupiterHeaders(),
        timeout: 15_000,
      }
    );

    if (response.status !== 200 || !response.data?.signature) {
      throw new Error(`Ultra execute returned status ${response.status} or missing signature`);
    }

    const signature = response.data.signature;
    console.log('[Jupiter Ultra] ✅ Swap submitted:', {
      signature,
      status: response.data.status,
      slot: response.data.slot
    });
    
    // Transaction is already submitted by Jupiter, just return the signature
    return signature;
  } catch (e: any) {
    const err = unwrapAxiosError(e);
    console.error('[Jupiter Ultra] Order execution failed:', err);
    throw new Error(`Failed to execute Ultra order: ${err.status || err.message}`);
  }
}

/**
 * Complete Ultra swap flow (order + sign + execute)
 */
export async function performUltraSwap(
  keypair: Keypair,
  params: UltraOrderParams
): Promise<string> {
  try {
    // Step 1: Create order (GET request - returns transaction in response)
    const order = await createUltraOrder(params);
    
    if (!order.transaction) {
      throw new Error('No transaction returned from order');
    }

    console.log('[Jupiter Ultra] Signing transaction...');
    
    // Step 2: Decode, sign, and serialize the transaction
    const transactionBytes = Uint8Array.from(atob(order.transaction), c => c.charCodeAt(0));
    const transaction = VersionedTransaction.deserialize(transactionBytes);
    
    // Sign with keypair
    transaction.sign([keypair]);
    
    // Convert signed transaction back to base64
    const signedTransactionBase64 = Buffer.from(transaction.serialize()).toString('base64');
    
    console.log('[Jupiter Ultra] Transaction signed');
    
    // Step 3: Execute order (POST signed transaction + requestId to /execute)
    const signature = await executeUltraOrder(order.orderId, signedTransactionBase64);

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

