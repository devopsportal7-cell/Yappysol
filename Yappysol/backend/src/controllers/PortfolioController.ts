import { Request, Response } from 'express';
import { UserPortfolioService } from '../services/UserPortfolioService';

export class PortfolioController {
  static async view(req: Request, res: Response) {
    const { user_id, wallet_address } = req.body;
    
    console.log('[PORTFOLIO] View request:', { user_id, wallet_address });
    
    try {
      if (!wallet_address) {
        return res.status(400).json({
          error: 'Wallet address is required'
        });
      }

      const portfolioService = new UserPortfolioService();
      
      // Use the same logic as the original system
      const portfolioData = await portfolioService.getUserPortfolioWithMetadata(wallet_address);
      
      // Format for n8n response
      const formattedPortfolio = {
        positions: portfolioData.map(token => ({
          token: token.symbol,
          mint: token.mint,
          balance: token.balance.toString(),
          value_usd: token.balanceUsd.toFixed(2),
          price: token.price,
          image: token.image,
          solscan_url: token.solscanUrl
        })),
        total_value_usd: portfolioData.reduce((sum, token) => sum + token.balanceUsd, 0).toFixed(2),
        total_tokens: portfolioData.length,
        wallet_address: wallet_address
      };

      res.json({
        status: 'success',
        portfolio: formattedPortfolio,
        message: `Portfolio for ${wallet_address}`
      });
    } catch (error) {
      console.error('[PORTFOLIO] View error:', error);
      res.status(500).json({
        error: 'Failed to fetch portfolio',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
