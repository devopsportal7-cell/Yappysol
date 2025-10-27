import { Router } from 'express';
import { jupiterSwapService } from '../services/JupiterSwapService';

const router = Router();

/**
 * GET /health/jupiter
 * Check Jupiter API connectivity
 */
router.get('/jupiter', async (req, res) => {
  try {
    // cheap quote check: SOL->USDC, tiny amount (1 lamport for reachability)
    const data = await jupiterSwapService.getQuote({
      inputMint: 'So11111111111111111111111111111111111111112',
      outputMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      amount: 1,
      slippageBps: 50,
    });
    
    res.json({ 
      ok: true, 
      via: data ? 'pro/lite' : 'none',
      inputMint: data.inputMint,
      outputMint: data.outputMint
    });
  } catch (e: any) {
    console.error('[HEALTH] Jupiter check failed:', e);
    res.status(502).json({ 
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

