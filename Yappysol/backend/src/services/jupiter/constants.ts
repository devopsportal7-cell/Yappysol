// Jupiter Ultra Swap API endpoints
export const JUP_ULTRA_ORDER   = 'https://api.jup.ag/ultra/v1/order';
export const JUP_ULTRA_EXECUTE = 'https://api.jup.ag/ultra/v1/execute';

// Legacy v6 endpoints (fallback only)
export const JUP_V6_QUOTE      = 'https://quote-api.jup.ag/v6/quote';
export const JUP_V6_SWAP       = 'https://quote-api.jup.ag/v6/swap';

/**
 * Get Jupiter API headers with authentication
 */
export function getJupiterHeaders(): Record<string, string> {
  const apiKey = process.env.JUPITER_API_KEY;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'yappysol-backend/1.0',
  };

  if (apiKey) {
    headers['x-api-key'] = apiKey;  // ✅ Lowercase as per Jupiter spec
    console.log('[Jupiter] ✅ Using API key:', `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`);
  } else {
    console.error('[Jupiter] ❌ JUPITER_API_KEY not configured - requests will fail!');
  }

  return headers;
}
