import { Request, Response } from 'express';
import { supabase } from '../lib/supabase';

export class TrendingController {
  static async list(req: Request, res: Response) {
    const { limit = 10, timeframe = '24h' } = req.body;
    
    console.log('[TRENDING] List request:', { limit, timeframe });
    
    try {
      // Query your existing trending_tokens_current table
      const { data: trendingTokens, error } = await supabase
        .from('trending_tokens_current')
        .select('rank, mint, name, symbol, price_str, pct_change')
        .order('rank', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('[TRENDING] Database error:', error);
        return res.status(500).json({
          error: 'Failed to fetch trending tokens from database',
          details: error.message
        });
      }

      if (!trendingTokens || trendingTokens.length === 0) {
        return res.status(404).json({
          error: 'No trending tokens found'
        });
      }

      // Format for n8n response
      const formattedTokens = trendingTokens.map((token: any) => ({
        token: token.symbol,
        symbol: token.symbol,
        price_usd: token.price_str || 'N/A',
        change_24h: token.pct_change ? `${token.pct_change > 0 ? '+' : ''}${token.pct_change.toFixed(2)}%` : 'N/A',
        volume_24h: 'N/A', // Not available in your table
        market_cap: 'N/A', // Not available in your table
        address: token.mint,
        rank: token.rank,
        name: token.name
      }));

      res.json({
        status: 'success',
        items: formattedTokens,
        timeframe: timeframe,
        message: `Top ${formattedTokens.length} trending tokens from database`
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
