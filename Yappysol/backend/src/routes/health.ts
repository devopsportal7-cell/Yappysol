import { Router } from 'express';
import { getJupiterHeaders } from '../services/jupiter/constants';
import { httpClient } from '../lib/httpClient';
import { JUP_ULTRA_ORDER } from '../services/jupiter/constants';

const router = Router();

/**
 * GET /health/jupiter
 * Check Jupiter Ultra Swap API connectivity
 */
router.get('/jupiter', async (req, res) => {
  try {
    // Test Ultra Swap API with a minimal order request
    const testParams = {
      userPublicKey: '11111111111111111111111111111112',
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 1_000_000, // 0.001 SOL (tiny test)
      slippageBps: 50,
    };

    const response = await httpClient.post(JUP_ULTRA_ORDER, testParams, {
      headers: getJupiterHeaders(),
      timeout: 10_000,
      validateStatus: (status) => status < 500, // Accept 4xx for testing
    });
    
    const hasApiKey = !!process.env.JUPITER_API_KEY;
    
    if (response.status === 200) {
      res.json({ 
        ok: true, 
        api: 'ultra-swap',
        hasApiKey,
        orderId: response.data?.orderId,
      });
    } else if (response.status === 401) {
      res.status(503).json({ 
        ok: false, 
        api: 'ultra-swap',
        hasApiKey,
        error: 'Invalid API key or unauthorized',
        details: response.data,
      });
    } else {
      res.status(503).json({ 
        ok: false, 
        api: 'ultra-swap',
        hasApiKey,
        status: response.status,
        error: response.data,
      });
    }
  } catch (e: any) {
    console.error('[HEALTH] Jupiter check failed:', e);
    const hasApiKey = !!process.env.JUPITER_API_KEY;
    res.status(503).json({ 
      ok: false,
      api: 'ultra-swap',
      hasApiKey,
      error: e?.message ?? String(e) 
    });
  }
});

/**
 * GET /health
 * Basic health check
 */
router.get('/', async (req, res) => {
  res.json({ 
    ok: true, 
    timestamp: new Date().toISOString(),
    service: 'yappysol-backend',
    jupiterApiKeyConfigured: !!process.env.JUPITER_API_KEY
  });
});

export default router;
