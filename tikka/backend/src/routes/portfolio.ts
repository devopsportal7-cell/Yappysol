import express from 'express';
import { UserPortfolioService } from '../services/UserPortfolioService';

const router = express.Router();
const portfolioService = new UserPortfolioService();

router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    console.log('[Portfolio Route] Fetching portfolio for:', walletAddress);
    const tokens = await portfolioService.getUserPortfolioWithMetadata(walletAddress);
    console.log('[Portfolio Route] Tokens:', tokens);
    res.json(tokens);
  } catch (e) {
    console.error('[Portfolio Route] Error:', e);
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router; 