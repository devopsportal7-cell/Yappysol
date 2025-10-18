"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const trendingTokensService_1 = __importDefault(require("../services/trendingTokensService"));
const router = (0, express_1.Router)();
// Get all trending tokens with details
router.get('/', async (_req, res) => {
    try {
        const tokens = await trendingTokensService_1.default.getTrendingTokensWithDetails();
        res.json({ prompt: tokens });
    }
    catch (error) {
        console.error('Error fetching trending tokens:', error);
        res.status(500).json({ prompt: 'Error fetching trending tokens' });
    }
});
// Update trending tokens list
router.post('/update', (req, res) => {
    try {
        const { tokens } = req.body;
        if (!Array.isArray(tokens)) {
            return res.status(400).json({ prompt: 'Invalid tokens format' });
        }
        const updatedTokens = trendingTokensService_1.default.updateTrendingTokens(tokens);
        res.json({ prompt: updatedTokens });
    }
    catch (error) {
        console.error('Error updating trending tokens:', error);
        res.status(500).json({ prompt: 'Error updating trending tokens' });
    }
});
exports.default = router;
