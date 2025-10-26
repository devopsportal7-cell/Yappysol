"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserPortfolioService_1 = require("../services/UserPortfolioService");
const BalanceCacheService_1 = require("../services/BalanceCacheService");
const logger_1 = require("../utils/logger");
const router = express_1.default.Router();
const portfolioService = new UserPortfolioService_1.UserPortfolioService();
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        logger_1.logger.info('[Portfolio Route] Fetching portfolio for:', { walletAddress });
        // Try to get from cache first
        const cachedPortfolio = await BalanceCacheService_1.balanceCacheService.getFromCache(walletAddress);
        if (cachedPortfolio) {
            logger_1.logger.info('[Portfolio Route] Returning cached portfolio', {
                walletAddress,
                tokenCount: cachedPortfolio.tokens.length,
                totalUsdValue: cachedPortfolio.totalUsdValue
            });
            return res.json(cachedPortfolio);
        }
        // If no cache, fetch fresh data (this should rarely happen)
        logger_1.logger.warn('[Portfolio Route] No cached data found, fetching fresh', { walletAddress });
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
        await BalanceCacheService_1.balanceCacheService.updateCache(walletAddress, portfolio);
        logger_1.logger.info('[Portfolio Route] Fresh portfolio fetched and cached', {
            walletAddress,
            tokenCount: tokens.length
        });
        res.json(portfolio);
    }
    catch (e) {
        logger_1.logger.error('[Portfolio Route] Error:', { error: e, walletAddress: req.params.walletAddress });
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
