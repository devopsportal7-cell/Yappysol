import { Request, Response } from 'express';
import { TrendingService } from '../services/TrendingService';

export class TrendingController {
  static async list(req: Request, res: Response) {
    const { limit = 10, timeframe = '24h' } = req.body;
    
    console.log('[TRENDING] List request:', { limit, timeframe });
    
    try {
      const trendingService = new TrendingService();
      
      // Use the same trending logic as the original system
      const trendingTokens = await trendingService.getTrending(limit);
      
      // Format for n8n response
      const formattedTokens = trendingTokens.map((token: any) => ({
        token: token.baseToken?.symbol || 'Unknown',
        symbol: token.baseToken?.symbol || 'Unknown',
        price_usd: token.priceUsd || '0',
        change_24h: token.priceChange?.h24 ? `${token.priceChange.h24 > 0 ? '+' : ''}${token.priceChange.h24.toFixed(2)}%` : 'N/A',
        volume_24h: token.volume?.h24 || '0',
        market_cap: token.marketCap || '0',
        address: token.baseToken?.address || token.pairAddress,
        dex: token.dexId || 'Unknown',
        pair_address: token.pairAddress,
        url: token.url
      }));

      res.json({
        status: 'success',
        items: formattedTokens,
        timeframe: timeframe,
        message: `Top ${formattedTokens.length} trending tokens`
      });
    } catch (error) {
      console.error('[TRENDING] List error:', error);
      res.status(500).json({
        error: 'Failed to fetch trending tokens',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
