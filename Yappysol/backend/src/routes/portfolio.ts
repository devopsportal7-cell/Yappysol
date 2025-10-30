import express from 'express';
import { UserPortfolioService } from '../services/UserPortfolioService';
import { balanceCacheService } from '../services/BalanceCacheService';
import { logger } from '../utils/logger';

const router = express.Router();
const portfolioService = new UserPortfolioService();

router.get('/:walletAddress', async (req, res) => {
  const PORTFOLIO_TIMEOUT = 8000; // 8 second timeout to prevent hanging
  const { walletAddress } = req.params;
  
  try {
    logger.info('[Portfolio Route] Fetching portfolio for:', { walletAddress });

    // Set response timeout to prevent hanging
    req.setTimeout(PORTFOLIO_TIMEOUT, () => {
      logger.warn('[Portfolio Route] Request timeout', { walletAddress });
    });

    // Try to get from cache first (with timeout)
    const cachedPortfolio = await Promise.race([
      balanceCacheService.getFromCache(walletAddress),
      new Promise((resolve) => setTimeout(() => {
        logger.warn('[Portfolio Route] Cache lookup timeout');
        resolve(null);
      }, 2000))
    ]) as any;
    
    if (cachedPortfolio) {
      logger.info('[Portfolio Route] Returning cached portfolio', { 
        walletAddress, 
        tokenCount: cachedPortfolio.tokens?.length || 0,
        totalUsdValue: cachedPortfolio.totalUsdValue 
      });
      
      // Ensure YAPPY token is always included in cached portfolio
      const YAPPY_MINT = 'GHj3uUmLTUWwsdLFWSAgqYVk6j3qbfmKuQp98Ys9pump';
      const hasYappy = cachedPortfolio.tokens?.some((t: any) => t.mint === YAPPY_MINT);
      
      if (!hasYappy && cachedPortfolio.tokens) {
        // Get YAPPY price from Moralis
        let yappyPriceUsd = 0;
        try {
          const { getMoralis } = await import('../lib/moralis');
          const moralis = getMoralis();
          const priceResponse = await moralis.SolApi.token.getTokenPrice({
            network: 'mainnet',
            address: YAPPY_MINT
          });
          yappyPriceUsd = priceResponse?.raw?.usdPrice || 0;
        } catch (error) {
          logger.warn('[Portfolio Route] Could not fetch YAPPY price for cached portfolio', { error });
        }
        
        // Add YAPPY token to cached portfolio
        cachedPortfolio.tokens.push({
          mint: YAPPY_MINT,
          symbol: 'YAPPY',
          name: 'Yappy',
          accountUnit: YAPPY_MINT,
          uiAmount: 0,
          priceUsd: yappyPriceUsd,
          solEquivalent: 0,
          usdEquivalent: 0,
          image: '', // Will be provided later
          solscanUrl: `https://solscan.io/token/${YAPPY_MINT}`,
          decimals: 9
        });
        
        logger.info('[Portfolio Route] Added YAPPY token to cached portfolio', { 
          mint: YAPPY_MINT, 
          priceUsd: yappyPriceUsd 
        });
      }
      
      // Send cached portfolio to frontend WebSocket clients (non-blocking)
      Promise.resolve().then(async () => {
        try {
          const { frontendWebSocketServer } = await import('../services/FrontendWebSocketServer');
          frontendWebSocketServer.emitWalletUpdate(walletAddress, cachedPortfolio);
        } catch (e) {
          logger.error('[Portfolio Route] Error emitting WebSocket update:', e);
        }
      });
      
      // Set cache headers to prevent browser caching
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      return res.json(cachedPortfolio);
    }

    // If no cache, try to fetch fresh data with timeout
    // But don't block - return empty portfolio if it takes too long
    logger.warn('[Portfolio Route] No cached data found, fetching fresh from Helius', { walletAddress });
    
    try {
      const { heliusBalanceService } = await import('../services/HeliusBalanceService');
      const portfolioPromise = heliusBalanceService.getWalletPortfolio(walletAddress);
      
      const portfolio = await Promise.race([
        portfolioPromise,
        new Promise((resolve) => setTimeout(() => {
          logger.warn('[Portfolio Route] Fresh fetch timeout, returning empty portfolio');
          resolve({
            totalSolValue: 0,
            totalUsdValue: 0,
            tokens: []
          });
        }, PORTFOLIO_TIMEOUT - 1000)) // Leave 1 second buffer
      ]) as any;

      // Cache the fresh data for future requests (non-blocking)
      Promise.resolve().then(async () => {
        try {
          await balanceCacheService.updateCache(walletAddress, portfolio);
          const { frontendWebSocketServer } = await import('../services/FrontendWebSocketServer');
          frontendWebSocketServer.emitWalletUpdate(walletAddress, portfolio);
        } catch (e) {
          logger.error('[Portfolio Route] Error caching/emitting update:', e);
        }
      });
      
      logger.info('[Portfolio Route] Fresh portfolio fetched', { 
        walletAddress, 
        tokenCount: portfolio?.tokens?.length || 0 
      });
      
      // Set cache headers
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      
      res.json(portfolio);
    } catch (fetchError: any) {
      logger.error('[Portfolio Route] Error fetching fresh portfolio:', fetchError);
      // Return empty portfolio instead of error to prevent frontend from hanging
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      // Always include YAPPY token even in empty portfolio
      const YAPPY_MINT = 'GHj3uUmLTUWwsdLFWSAgqYVk6j3qbfmKuQp98Ys9pump';
      res.json({
        totalSolValue: 0,
        totalUsdValue: 0,
        tokens: [{
          mint: YAPPY_MINT,
          symbol: 'YAPPY',
          name: 'Yappy',
          accountUnit: YAPPY_MINT,
          uiAmount: 0,
          priceUsd: 0,
          solEquivalent: 0,
          usdEquivalent: 0,
          image: '', // Will be provided later
          solscanUrl: `https://solscan.io/token/${YAPPY_MINT}`,
          decimals: 9
        }]
      });
    }
  } catch (e: any) {
    logger.error('[Portfolio Route] Error:', { error: e?.message || e, walletAddress });
    // Always return a response to prevent hanging
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    });
    res.status(200).json({
      totalSolValue: 0,
      totalUsdValue: 0,
      tokens: []
    });
  }
});

export default router; 