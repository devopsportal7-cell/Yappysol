"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const router = (0, express_1.Router)();
// POST /api/helius-test
router.post('/', async (req, res) => {
    const { mint } = req.body;
    if (!mint) {
        return res.status(400).json({ error: 'Missing mint address in body' });
    }
    try {
        const response = await axios_1.default.post(`https://api.helius.xyz/v0/token-metadata?api-key=${config_1.default.HELIUS_API_KEY}`, {
            mintAccounts: [mint],
            includeOffChain: false,
            disableCache: false
        }, {
            headers: { 'Content-Type': 'application/json' }
        });
        res.json(response.data);
    }
    catch (error) {
        res.status(500).json({ error: error?.toString() });
    }
});
exports.default = router;
