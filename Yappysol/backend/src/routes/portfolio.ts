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
      
      // Send cached portfolio to frontend WebSocket clients
      const { frontendWebSocketServer } = await import('../services/FrontendWebSocketServer');
      frontendWebSocketServer.emitWalletUpdate(walletAddress, cachedPortfolio);
      
      return res.json(cachedPortfolio);
    }

    // If no cache, fetch fresh data using HeliusBalanceService (with USD conversion fix)
    logger.warn('[Portfolio Route] No cached data found, fetching fresh from Helius', { walletAddress });
    const { heliusBalanceService } = await import('../services/HeliusBalanceService');
    const portfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);

    // Cache the fresh data for future requests
    await balanceCacheService.updateCache(walletAddress, portfolio);
    
    // Send fresh portfolio to frontend WebSocket clients
    const { frontendWebSocketServer } = await import('../services/FrontendWebSocketServer');
    frontendWebSocketServer.emitWalletUpdate(walletAddress, portfolio);
    
    logger.info('[Portfolio Route] Fresh portfolio fetched and cached', { 
      walletAddress, 
      tokenCount: portfolio.tokens.length 
    });
    
    res.json(portfolio);
  } catch (e) {
    logger.error('[Portfolio Route] Error:', { error: e, walletAddress: req.params.walletAddress });
    res.status(500).json({ error: 'Failed to fetch portfolio' });
  }
});

export default router; 