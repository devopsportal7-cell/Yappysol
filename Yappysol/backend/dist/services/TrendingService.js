"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendingService = void 0;
const supabase_1 = require("../lib/supabase");
class TrendingService {
    async getTrending(limit = 10) {
        try {
            console.log('[TrendingService] Fetching trending tokens from Supabase...');
            const { data: trendingTokens, error } = await supabase_1.supabase
                .from('trending_tokens_current')
                .select('rank, mint, name, symbol, price_str, pct_change, image_url, solscan_url, updated_at')
                .order('rank', { ascending: true })
                .limit(limit);
            if (error) {
                console.error('[TrendingService] Database error:', error);
                return [];
            }
            if (!trendingTokens || trendingTokens.length === 0) {
                console.log('[TrendingService] No trending tokens found in database');
                return [];
            }
            console.log('[TrendingService] Found tokens:', trendingTokens.length);
            // Format to match the expected structure for ChatService
            return trendingTokens.map((token) => ({
                symbol: token.symbol,
                name: token.name,
                priceUsd: token.price_str?.replace('$', '') || 'N/A',
                priceChange: {
                    h24: token.pct_change ? `${token.pct_change}%` : 'N/A'
                },
                volume: {
                    h24: 'N/A' // Not available in your table
                },
                address: token.mint,
                rank: token.rank,
                imageUrl: token.image_url,
                solscanUrl: token.solscan_url,
                updatedAt: token.updated_at
            }));
        }
        catch (error) {
            console.error('[TrendingService] Error fetching trending tokens:', error);
            return [];
        }
    }
}
exports.TrendingService = TrendingService;
