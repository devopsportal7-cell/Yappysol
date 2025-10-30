"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
    const PORTFOLIO_TIMEOUT = 8000; // 8 second timeout to prevent hanging
    const { walletAddress } = req.params;
    try {
        logger_1.logger.info('[Portfolio Route] Fetching portfolio for:', { walletAddress });
        // Set response timeout to prevent hanging
        req.setTimeout(PORTFOLIO_TIMEOUT, () => {
            logger_1.logger.warn('[Portfolio Route] Request timeout', { walletAddress });
        });
        // Try to get from cache first (with timeout)
        const cachedPortfolio = await Promise.race([
            BalanceCacheService_1.balanceCacheService.getFromCache(walletAddress),
            new Promise((resolve) => setTimeout(() => {
                logger_1.logger.warn('[Portfolio Route] Cache lookup timeout');
                resolve(null);
            }, 2000))
        ]);
        if (cachedPortfolio) {
            logger_1.logger.info('[Portfolio Route] Returning cached portfolio', {
                walletAddress,
                tokenCount: cachedPortfolio.tokens?.length || 0,
                totalUsdValue: cachedPortfolio.totalUsdValue
            });
            // Ensure YAPPY token is always included in cached portfolio
            const YAPPY_MINT = 'GHj3uUmLTUWwsdLFWSAgqYVk6j3qbfmKuQp98Ys9pump';
            const hasYappy = cachedPortfolio.tokens?.some((t) => t.mint === YAPPY_MINT);
            if (!hasYappy && cachedPortfolio.tokens) {
                // Get YAPPY price from Moralis
                let yappyPriceUsd = 0;
                try {
                    const { getMoralis } = await Promise.resolve().then(() => __importStar(require('../lib/moralis')));
                    const moralis = getMoralis();
                    const priceResponse = await moralis.SolApi.token.getTokenPrice({
                        network: 'mainnet',
                        address: YAPPY_MINT
                    });
                    yappyPriceUsd = priceResponse?.raw?.usdPrice || 0;
                }
                catch (error) {
                    logger_1.logger.warn('[Portfolio Route] Could not fetch YAPPY price for cached portfolio', { error });
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
                logger_1.logger.info('[Portfolio Route] Added YAPPY token to cached portfolio', {
                    mint: YAPPY_MINT,
                    priceUsd: yappyPriceUsd
                });
            }
            // Send cached portfolio to frontend WebSocket clients (non-blocking)
            Promise.resolve().then(async () => {
                try {
                    const { frontendWebSocketServer } = await Promise.resolve().then(() => __importStar(require('../services/FrontendWebSocketServer')));
                    frontendWebSocketServer.emitWalletUpdate(walletAddress, cachedPortfolio);
                }
                catch (e) {
                    logger_1.logger.error('[Portfolio Route] Error emitting WebSocket update:', e);
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
        logger_1.logger.warn('[Portfolio Route] No cached data found, fetching fresh from Helius', { walletAddress });
        try {
            const { heliusBalanceService } = await Promise.resolve().then(() => __importStar(require('../services/HeliusBalanceService')));
            const portfolioPromise = heliusBalanceService.getWalletPortfolio(walletAddress);
            const portfolio = await Promise.race([
                portfolioPromise,
                new Promise((resolve) => setTimeout(() => {
                    logger_1.logger.warn('[Portfolio Route] Fresh fetch timeout, returning empty portfolio');
                    resolve({
                        totalSolValue: 0,
                        totalUsdValue: 0,
                        tokens: []
                    });
                }, PORTFOLIO_TIMEOUT - 1000)) // Leave 1 second buffer
            ]);
            // Cache the fresh data for future requests (non-blocking)
            Promise.resolve().then(async () => {
                try {
                    await BalanceCacheService_1.balanceCacheService.updateCache(walletAddress, portfolio);
                    const { frontendWebSocketServer } = await Promise.resolve().then(() => __importStar(require('../services/FrontendWebSocketServer')));
                    frontendWebSocketServer.emitWalletUpdate(walletAddress, portfolio);
                }
                catch (e) {
                    logger_1.logger.error('[Portfolio Route] Error caching/emitting update:', e);
                }
            });
            logger_1.logger.info('[Portfolio Route] Fresh portfolio fetched', {
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
        }
        catch (fetchError) {
            logger_1.logger.error('[Portfolio Route] Error fetching fresh portfolio:', fetchError);
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
    }
    catch (e) {
        logger_1.logger.error('[Portfolio Route] Error:', { error: e?.message || e, walletAddress });
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
exports.default = router;
