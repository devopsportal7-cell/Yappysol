import express from 'express';
import { UserPortfolioService } from '../services/UserPortfolioService';
import { balanceCacheService } from '../services/BalanceCacheService';
import { logger } from '../utils/logger';

const router = express.Router();
const portfolioService = new UserPortfolioService();

router.get('/:walletAddress', async (req, res) => {
  try {
    const { walletAddress } = req.params;
    logger.info('[Portfolio Route] Fetching portfolio for:', { walletAddress });

    // Try to get from cache first
    const cachedPortfolio = await balanceCacheService.getFromCache(walletAddress);
    
    if (cachedPortfolio) {
      logger.info('[Portfolio Route] Returning cached portfolio', { 
        walletAddress, 
        tokenCount: cachedPortfolio.tokens.length,
        totalUsdValue: cachedPortfolio.totalUsdValue 
      });
      return res.json(cachedPortfolio);
    }

    // If no cache, fetch fresh data (this should rarely happen)
    logger.warn('[Portfolio Route] No cached data found, fetching fresh', { walletAddress });
    const tokens = await portfolioService.getUserPortfolioWithMetadata(walletAddress);
    
    // Cache the fresh data for future requests
    const portfolio = {
      totalSolValue: tokens.reduce((sum, token) => sum + (token.balanceUsd || 0) / 100, 0), // Rough SOL conversion
      totalUsdValue: tokens.reduce((sum, token) => sum + (token.balanceUsd || 0), 0),
      tokens: tokens.map(token => ({
        mint: token.mint,
        symbol: token.symbol,
        name: token.symbol, // Use symbol as name fallback
        accountUnit: token.mint,
        uiAmount: token.balance,
        priceUsd: token.price,
        solEquivalent: (token.balanceUsd || 0) / 100, // Rough SOL conversion
        usdEquivalent: token.balanceUsd || 0,
        image: token.image,
        solscanUrl: token.solscanUrl,
        decimals: 9 // Default decimals
      }))
    };

    // Cache the portfolio
    await balanceCacheService.updateCache(walletAddress, portfolio);
    
    logger.info('[Portfolio Route] Fresh portfolio fetched and cached', { 
      walletAddress, 
      tokenCount: tokens.length 
    });
    
    res.json(portfolio);
  } catch (e) {
    logger.error('[Portfolio Route] Error:', { error: e, walletAddress: req.params.walletAddress });
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router; 