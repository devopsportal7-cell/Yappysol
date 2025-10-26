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
            // Send cached portfolio to frontend WebSocket clients
            const { frontendWebSocketServer } = await Promise.resolve().then(() => __importStar(require('../services/FrontendWebSocketServer')));
            frontendWebSocketServer.emitWalletUpdate(walletAddress, cachedPortfolio);
            return res.json(cachedPortfolio);
        }
        // If no cache, fetch fresh data using HeliusBalanceService (with USD conversion fix)
        logger_1.logger.warn('[Portfolio Route] No cached data found, fetching fresh from Helius', { walletAddress });
        const { heliusBalanceService } = await Promise.resolve().then(() => __importStar(require('../services/HeliusBalanceService')));
        const portfolio = await heliusBalanceService.getWalletPortfolio(walletAddress);
        // Cache the fresh data for future requests
        await BalanceCacheService_1.balanceCacheService.updateCache(walletAddress, portfolio);
        // Send fresh portfolio to frontend WebSocket clients
        const { frontendWebSocketServer } = await Promise.resolve().then(() => __importStar(require('../services/FrontendWebSocketServer')));
        frontendWebSocketServer.emitWalletUpdate(walletAddress, portfolio);
        logger_1.logger.info('[Portfolio Route] Fresh portfolio fetched and cached', {
            walletAddress,
            tokenCount: portfolio.tokens.length
        });
        res.json(portfolio);
    }
    catch (e) {
        logger_1.logger.error('[Portfolio Route] Error:', { error: e, walletAddress: req.params.walletAddress });
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
