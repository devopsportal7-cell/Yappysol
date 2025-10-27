import { httpClient } from '../../lib/httpClient';
import { resolveSwapUrl, JUP_V6_SWAP } from './constants';
import type { QuoteResult } from './quote';

function unwrapAxios(e: any) {
  return {
    status: e?.response?.status,
    data: e?.response?.data,
    message: e?.message ?? String(e),
    code: e?.code,
  };
}

export interface SwapResult {
  source: string;
  swapTransaction: string;
}

/**
 * Post swap transaction request to Jupiter
 * Automatically routes to matching host and falls back to v6 on 401
 */
export async function postSwap(
  quoteResult: QuoteResult,
  userPublicKey: string
): Promise<SwapResult> {
  const swapUrl = resolveSwapUrl(quoteResult.source);
  const body = {
    quoteResponse: quoteResult.data, // Pass EXACT quote response as-is
    userPublicKey,
    wrapUnwrapSOL: true,
    asLegacyTransaction: false,
  };

  console.log('[Jupiter Swap] Posting swap to:', { url: swapUrl, source: quoteResult.source });

  try {
    const response = await httpClient.post(swapUrl, body, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      timeout: 12_000,
    });

    if (response.status === 200 && response.data?.swapTransaction) {
      console.log('[Jupiter Swap] ✅ Swap successful from', quoteResult.source);
      return { source: quoteResult.source, swapTransaction: response.data.swapTransaction };
    }

    throw new Error(`Swap returned status ${response.status}`);
  } catch (e: any) {
    const err = unwrapAxios(e);
    console.warn('[Jupiter Swap] Primary endpoint failed:', { url: swapUrl, ...err });

    // Fallback to v6 on auth errors (401/403)
    if (err.status === 401 || err.status === 403) {
      console.log('[Jupiter Swap] Auth error detected, falling back to v6...');
      
      try {
        const v6Response = await httpClient.post(JUP_V6_SWAP, body, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          timeout: 12_000,
        });

        if (v6Response.status === 200 && v6Response.data?.swapTransaction) {
          console.log('[Jupiter Swap] ✅ v6 fallback successful');
          return { source: 'v6', swapTransaction: v6Response.data.swapTransaction };
        }

        throw new Error(`v6 fallback returned status ${v6Response.status}`);
      } catch (e2: any) {
        const err2 = unwrapAxios(e2);
        console.error('[Jupiter Swap] v6 fallback failed:', err2);
        throw new Error(`Both primary and v6 swap failed. Last error: ${err2.status || err2.message}`);
      }
    }

    // Not an auth error, propagate original error
    throw e;
  }
}

