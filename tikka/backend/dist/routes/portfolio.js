"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const UserPortfolioService_1 = require("../services/UserPortfolioService");
const router = express_1.default.Router();
const portfolioService = new UserPortfolioService_1.UserPortfolioService();
router.get('/:walletAddress', async (req, res) => {
    try {
        const { walletAddress } = req.params;
        console.log('[Portfolio Route] Fetching portfolio for:', walletAddress);
        const tokens = await portfolioService.getUserPortfolioWithMetadata(walletAddress);
        console.log('[Portfolio Route] Tokens:', tokens);
        res.json(tokens);
    }
    catch (e) {
        console.error('[Portfolio Route] Error:', e);
        res.status(500).json({ error: 'Failed to fetch portfolio' });
    }
});
exports.default = router;
