import { Request, Response } from 'express';

export class TrendingController {
  static async list(req: Request, res: Response) {
    const { limit = 10, timeframe = '24h' } = req.body;
    
    console.log('[TRENDING] List request:', { limit, timeframe });
    
    try {
      // TODO: Implement actual trending tokens from Dexscreener/CoinGecko
      // For now, return mock data
      const mockTrending = [
        {
          token: 'SOL',
          symbol: 'SOL',
          price_usd: '100.50',
          change_24h: '+5.2%',
          volume_24h: '1000000',
          market_cap: '50000000'
        },
        {
          token: 'USDC',
          symbol: 'USDC',
          price_usd: '1.00',
          change_24h: '0.0%',
          volume_24h: '500000',
          market_cap: '30000000'
        },
        {
          token: 'BONK',
          symbol: 'BONK',
          price_usd: '0.000012',
          change_24h: '+15.3%',
          volume_24h: '2000000',
          market_cap: '10000000'
        }
      ];

      res.json({
        status: 'success',
        items: mockTrending.slice(0, limit),
        timeframe: timeframe,
        message: `Top ${limit} trending tokens`
      });
    } catch (error) {
      console.error('[TRENDING] List error:', error);
      res.status(500).json({
        error: 'Failed to fetch trending tokens'
      });
    }
  }
}
