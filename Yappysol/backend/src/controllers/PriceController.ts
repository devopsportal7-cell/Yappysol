import { Request, Response } from 'express';

export class PriceController {
  static async quote(req: Request, res: Response) {
    const { token, chain } = req.body;
    
    console.log('[PRICE] Quote request:', { token, chain });
    
    try {
      // TODO: Implement actual price fetching from Dexscreener/CoinGecko
      // For now, return mock data
      const mockPrice = {
        token: token || 'SOL',
        price_usd: '100.50',
        price_sol: '0.1',
        change_24h: '+5.2%',
        volume_24h: '1000000',
        market_cap: '50000000',
        liquidity_usd: '5000000',
        last_updated: new Date().toISOString()
      };

      res.json({
        status: 'success',
        price: mockPrice,
        message: `Price for ${token}`
      });
    } catch (error) {
      console.error('[PRICE] Quote error:', error);
      res.status(500).json({
        error: 'Failed to fetch price'
      });
    }
  }
}
