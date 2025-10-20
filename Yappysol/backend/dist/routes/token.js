"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const TokenPriceService_1 = require("../services/TokenPriceService");
const TokenCreationService_1 = require("../services/TokenCreationService");
const TokenSwapService_1 = require("../services/TokenSwapService");
const TrendingService_1 = require("../services/TrendingService");
const UserPortfolioService_1 = require("../services/UserPortfolioService");
const MoralisTestService_1 = require("../services/MoralisTestService");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const router = (0, express_1.Router)();
const priceService = new TokenPriceService_1.TokenPriceService();
const creationService = new TokenCreationService_1.TokenCreationService();
const swapService = new TokenSwapService_1.TokenSwapService();
const trendingService = new TrendingService_1.TrendingService();
const portfolioService = new UserPortfolioService_1.UserPortfolioService();
const moralisTestService = new MoralisTestService_1.MoralisTestService();
router.post('/price', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { tokenAddress } = req.body;
    if (!tokenAddress) {
        return res.status(400).json({ error: 'Token address is required' });
    }
    try {
        const priceInfo = await priceService.getTokenPriceWithMetadata(tokenAddress);
        res.json(priceInfo);
    }
    catch (error) {
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
router.post('/portfolio', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) {
        return res.status(400).json({ error: 'Wallet address is required' });
    }
    try {
        const result = await portfolioService.formatPortfolioForChat(walletAddress);
        res.json({ message: result });
    }
    catch (error) {
        console.error('Error fetching portfolio:', error);
        res.status(500).json({ error: 'Failed to fetch portfolio', details: error instanceof Error ? error.message : 'Unknown error' });
    }
}));
router.post('/create', async (req, res) => {
    try {
        const result = await creationService.createToken(req.body);
        res.json(result);
    }
    catch (error) {
        res.status(500).json({ error: 'Token creation error', details: error?.toString() });
    }
});
router.post('/chat/swap', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.wallet;
    if (!userId)
        return res.status(401).json({ error: 'Authentication required' });
    const { input } = req.body;
    if (!input)
        return res.status(400).json({ error: 'Input is required' });
    try {
        const result = await swapService.handleSwapIntent(input, { walletAddress: userId });
        res.json(result);
    }
    catch (error) {
        console.error('Error handling swap:', error);
        res.status(500).json({ error: 'Failed to process swap request', details: error?.toString() });
    }
}));
router.get('/trending', async (req, res) => {
    try {
        const limit = req.query.limit ? parseInt(req.query.limit, 10) : 10;
        const trending = await trendingService.getTrending(limit);
        res.json(trending);
    }
    catch (error) {
        res.status(500).json({ error: 'Trending error', details: error?.toString() });
    }
});
router.get('/moralis/test-price/:mint', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const { mint } = req.params;
        const data = await moralisTestService.getTokenPrice(mint);
        res.json(data);
    }
    catch (e) {
        res.status(500).json({ error: e.message });
    }
}));
exports.default = router;
