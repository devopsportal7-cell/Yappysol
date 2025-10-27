// Jupiter Ultra Swap API endpoints
export const JUP_ULTRA_ORDER   = 'https://api.jup.ag/ultra/v1/order';
export const JUP_ULTRA_EXECUTE = 'https://api.jup.ag/ultra/v1/execute';
export const JUP_LITE_ORDER    = 'https://lite-api.jup.ag/ultra/v1/order';
export const JUP_LITE_EXECUTE  = 'https://lite-api.jup.ag/ultra/v1/execute';

/**
 * Check if an endpoint URL is a Lite endpoint
 */
export function isLiteEndpoint(url: string): boolean {
  return url.includes('lite-api.jup.ag');
}

// Legacy v6 endpoints (fallback only)
export const JUP_V6_QUOTE      = 'https://quote-api.jup.ag/v6/quote';
export const JUP_V6_SWAP       = 'https://quote-api.jup.ag/v6/swap';

/**
 * Get Jupiter API headers with authentication
 */
export function getJupiterHeaders(): Record<string, string> {
  // Try both env var names
  const apiKey = process.env.JUPITER_API_KEY || process.env.JUP_API_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'yappysol-backend/1.0',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;  // ✅ Lowercase as per Jupiter spec
    console.log('[Jupiter] ✅ API key configured:', {
      hasKey: !!apiKey,
      keyLength: apiKey?.length,
      keyPrefix: apiKey?.slice(0, 8),
      keySuffix: apiKey?.slice(-4)
    });
  } else {
    console.error('[Jupiter] ❌ API key not found in JUPITER_API_KEY or JUP_API_KEY env vars!');
    console.log('[Jupiter] Available env vars:', {
      hasJupiter: !!process.env.JUPITER_API_KEY,
      hasJup: !!process.env.JUP_API_KEY
    });
  }

  return headers;
}
