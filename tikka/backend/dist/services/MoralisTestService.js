"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoralisTestService = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
class MoralisTestService {
    async getTokenPrice(mint) {
        const apiKey = process.env.MORALIS_API_KEY;
        if (!apiKey) {
            throw new Error('Moralis API key not set on server');
        }
        const url = `https://solana-gateway.moralis.io/token/mainnet/${mint}/price`;
        const response = await (0, node_fetch_1.default)(url, {
            headers: {
                'accept': 'application/json',
                'X-API-Key': apiKey,
            },
        });
        if (!response.ok) {
            throw new Error(`Moralis error: ${response.status}`);
        }
        return await response.json();
    }
}
exports.MoralisTestService = MoralisTestService;
