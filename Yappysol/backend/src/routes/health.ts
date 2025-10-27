import { Router } from 'express';
import { getQuote } from '../services/jupiter/quote';

const router = Router();

/**
 * GET /health/jupiter
 * Check Jupiter API connectivity
 */
router.get('/jupiter', async (req, res) => {
  try {
    // cheap quote check: SOL->USDT, tiny amount (1 lamport for reachability)
    const quoteResult = await getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      amount: 1_000_000, // 1 SOL worth of lamports
      slippageBps: 50,
      swapMode: 'ExactIn',
      onlyDirectRoutes: false,
    });
    
    res.json({ 
      ok: true, 
      quoteSource: quoteResult.source,
      dataKeys: Object.keys(quoteResult.data || {}).slice(0, 5),
      inputMint: quoteResult.data?.inputMint,
      outputMint: quoteResult.data?.outputMint
    });
  } catch (e: any) {
    console.error('[HEALTH] Jupiter check failed:', e);
    res.status(503).json({ 
      ok: false, 
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
    service: 'yappysol-backend'
  });
});

export default router;

