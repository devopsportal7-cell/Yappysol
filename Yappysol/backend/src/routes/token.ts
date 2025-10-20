import { Router, Request, Response } from 'express';
import { TokenPriceService } from '../services/TokenPriceService';
import { TokenCreationService } from '../services/TokenCreationService';
import { TokenSwapService } from '../services/TokenSwapService';
import { TrendingService } from '../services/TrendingService';
import { UserPortfolioService } from '../services/UserPortfolioService';
import { MoralisTestService } from '../services/MoralisTestService';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const priceService = new TokenPriceService();
const creationService = new TokenCreationService();
const swapService = new TokenSwapService();
const trendingService = new TrendingService();
const portfolioService = new UserPortfolioService();
const moralisTestService = new MoralisTestService();

router.post('/price', asyncHandler(async (req: Request, res: Response) => {
  const { tokenAddress } = req.body;
  
  if (!tokenAddress) {
    return res.status(400).json({ error: 'Token address is required' });
  }

  try {
    const priceInfo = await priceService.getTokenPriceWithMetadata(tokenAddress);
    res.json(priceInfo);
  } catch (error) {
    console.error('Error fetching token price:', error);
    
    // Check if the error is due to uninitialized service
    if (error instanceof Error && error.message === 'Price service is not initialized') {
      return res.status(503).json({ 
        error: 'Price service is currently unavailable',
        message: 'Please ensure MORALIS_API_KEY is set in your environment variables'
      });
    }

    res.status(500).json({ 
      error: 'Failed to fetch token price', 
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}));

router.post('/portfolio', asyncHandler(async (req: Request, res: Response) => {
  const { walletAddress } = req.body;
  if (!walletAddress) {
    return res.status(400).json({ error: 'Wallet address is required' });
  }
  try {
    const result = await portfolioService.formatPortfolioForChat(walletAddress);
    res.json({ message: result });
  } catch (error) {
    console.error('Error fetching portfolio:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio', details: error instanceof Error ? error.message : 'Unknown error' });
  }
}));

router.post('/create', async (req, res) => {
  try {
    const result = await creationService.createToken(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Token creation error', details: error?.toString() });
  }
});

router.post('/chat/swap', authMiddleware, asyncHandler(async (req: Request, res: Response) => {
  const userId = req.user?.wallet;
  if (!userId) return res.status(401).json({ error: 'Authentication required' });

  const { input } = req.body;
  if (!input) return res.status(400).json({ error: 'Input is required' });

  try {
    const result = await swapService.handleSwapIntent(input, { walletAddress: userId });
    res.json(result);
  } catch (error) {
    console.error('Error handling swap:', error);
    res.status(500).json({ error: 'Failed to process swap request', details: error?.toString() });
  }
}));

router.get('/trending', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    const trending = await trendingService.getTrending(limit);
    res.json(trending);
  } catch (error) {
    res.status(500).json({ error: 'Trending error', details: error?.toString() });
  }
});

router.get('/moralis/test-price/:mint', asyncHandler(async (req: Request, res: Response) => {
  try {
    const { mint } = req.params;
    const data = await moralisTestService.getTokenPrice(mint);
    res.json(data);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}));

export default router; 