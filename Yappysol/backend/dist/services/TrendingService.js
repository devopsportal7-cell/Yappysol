"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendingService = void 0;
const axios_1 = __importDefault(require("axios"));
class TrendingService {
    async getTrending(limit = 10) {
        try {
            console.log('[TrendingService] Fetching trending tokens...');
            const url = 'https://api.dexscreener.com/latest/dex/tokens/trending';
            const response = await axios_1.default.get(url);
            console.log('[TrendingService] API response:', response.data);
            const pairs = response.data.pairs?.slice(0, limit) || [];
            console.log('[TrendingService] Found pairs:', pairs.length);
            return pairs;
        }
        catch (error) {
            console.error('[TrendingService] Error fetching trending tokens:', error);
            return [];
        }
    }
}
exports.TrendingService = TrendingService;
