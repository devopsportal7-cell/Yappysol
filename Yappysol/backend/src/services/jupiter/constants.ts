// Jupiter API endpoints
export const JUP_PRO_QUOTE  = 'https://api.jup.ag/swap/v1/quote';
export const JUP_LITE_QUOTE = 'https://lite-api.jup.ag/swap/v1/quote';
export const JUP_PRO_SWAP   = 'https://api.jup.ag/swap/v1/swap';
export const JUP_LITE_SWAP  = 'https://lite-api.jup.ag/swap/v1/swap';
export const JUP_V6_QUOTE   = 'https://quote-api.jup.ag/v6/quote';
export const JUP_V6_SWAP    = 'https://quote-api.jup.ag/v6/swap';

export type QuoteSource = 'pro-v1' | 'lite-v1' | 'v6';

/**
 * Resolve swap URL based on quote source
 */
export function resolveSwapUrl(source: QuoteSource): string {
  if (source === 'pro-v1') return JUP_PRO_SWAP;
  if (source === 'lite-v1') return JUP_LITE_SWAP;
  return JUP_V6_SWAP; // v6 as fallback
}

/**
 * Build query string for Jupiter API (v1 and v6)
 */
export function buildQueryString(params: {
  inputMint: string;
  outputMint: string;
  amount: number;
  slippageBps?: number;
  swapMode?: 'ExactIn' | 'ExactOut';
  onlyDirectRoutes?: boolean;
}): string {
  const qs = new URLSearchParams({
    inputMint: params.inputMint,
    outputMint: params.outputMint,
    amount: String(params.amount), // ✅ Correct parameter name
    slippageBps: String(params.slippageBps ?? 50),
    swapMode: params.swapMode ?? 'ExactIn',
    onlyDirectRoutes: String(params.onlyDirectRoutes ?? false),
  });
  return qs.toString();
}

