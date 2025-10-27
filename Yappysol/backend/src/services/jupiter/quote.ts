import { httpClient } from '../../lib/httpClient';
import { JUP_PRO_QUOTE, JUP_LITE_QUOTE, JUP_V6_QUOTE, buildQueryString, QuoteSource } from './constants';

export interface QuoteParams {
  inputMint: string;
  outputMint: string;
  amount: number; // raw units (lamports if SOL)
  slippageBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
  onlyDirectRoutes?: boolean;
}

export interface QuoteResult {
  source: QuoteSource;
  data: any;
}

function unwrapAxios(e: any) {
  return {
    status: e?.response?.status,
    data: e?.response?.data,
    message: e?.message ?? String(e),
    code: e?.code,
  };
}

/**
 * Get quote from Jupiter with fallback chain: Pro v1 → Lite v1 → v6
 */
export async function getQuote(params: QuoteParams): Promise<QuoteResult> {
  // Validate inputs
  if (!params.inputMint || !params.outputMint) {
    throw new Error('Missing input/output mint');
  }
  if (!Number.isFinite(params.amount) || params.amount <= 0) {
    throw new Error('Amount must be greater than zero');
  }

  const qs = buildQueryString(params);
  const commonHeaders = {
    'Accept': 'application/json',
    'User-Agent': 'yappysol-backend/1.0 (+https://yappysol.onrender.com)',
  };

  // Try Pro v1 first
  try {
    console.log('[Jupiter Quote] Trying Pro v1...');
    const response = await httpClient.get(`${JUP_PRO_QUOTE}?${qs}`, {
      headers: commonHeaders,
      timeout: 10_000,
    });
    
    if (response.status === 200) {
      console.log('[Jupiter Quote] ✅ Pro v1 success');
      return { source: 'pro-v1', data: response.data };
    }
  } catch (e1) {
    const err1 = unwrapAxios(e1);
    console.warn('[Jupiter Quote] Pro v1 failed:', err1);
  }

  // Fallback to Lite v1
  try {
    console.log('[Jupiter Quote] Trying Lite v1...');
    const response = await httpClient.get(`${JUP_LITE_QUOTE}?${qs}`, {
      headers: commonHeaders,
      timeout: 10_000,
    });
    
    if (response.status === 200) {
      console.log('[Jupiter Quote] ✅ Lite v1 success');
      return { source: 'lite-v1', data: response.data };
    }
  } catch (e2) {
    const err2 = unwrapAxios(e2);
    console.warn('[Jupiter Quote] Lite v1 failed:', err2);
  }

  // Fallback to v6 legacy
  try {
    console.log('[Jupiter Quote] Trying v6 (legacy)...');
    const response = await httpClient.get(`${JUP_V6_QUOTE}?${qs}`, {
      headers: commonHeaders,
      timeout: 10_000,
    });
    
    if (response.status === 200) {
      console.log('[Jupiter Quote] ✅ v6 success');
      return { source: 'v6', data: response.data };
    }
  } catch (e3) {
    const err3 = unwrapAxios(e3);
    console.error('[Jupiter Quote] v6 failed:', err3);
  }

  // All endpoints failed
  throw new Error('All Jupiter quote endpoints failed');
}

