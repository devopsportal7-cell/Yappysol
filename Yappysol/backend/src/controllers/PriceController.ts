import { Request, Response } from 'express';
import { TokenPriceService } from '../services/TokenPriceService';

export class PriceController {
  static async quote(req: Request, res: Response) {
    const { token, chain } = req.body;
    
    console.log('[PRICE] Quote request:', { token, chain });
    
    try {
      const tokenPriceService = new TokenPriceService();
      
      // Handle different token input formats
      let tokenAddress: string | null = null;
      
      if (token) {
        // Check if it's a common token symbol
        const commonTokens: { [key: string]: string } = {
          'SOL': 'So11111111111111111111111111111111111111112',
          'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
          'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
          'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
          'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
        };
        
        const upperToken = token.toUpperCase();
        tokenAddress = commonTokens[upperToken] || token;
      }
      
      if (!tokenAddress) {
        return res.status(400).json({
          error: 'Token address or symbol required'
        });
      }
      
      // Get real-time price data from Moralis
      const priceInfo = await tokenPriceService.getTokenPriceWithMetadata(tokenAddress);
      
      if (!priceInfo.usdPrice || priceInfo.nativePrice === null) {
        return res.status(404).json({
          error: 'Price data not available for this token'
        });
      }
      
      const response = {
        status: 'success',
        price: {
          token: priceInfo.symbol || token,
          price_usd: priceInfo.usdPrice.toFixed(4),
          price_sol: priceInfo.nativePrice ? priceInfo.nativePrice.toFixed(6) : null,
          change_24h: 'N/A', // Moralis doesn't provide 24h change in this endpoint
          volume_24h: 'N/A', // Moralis doesn't provide volume in this endpoint
          market_cap: 'N/A', // Moralis doesn't provide market cap in this endpoint
          liquidity_usd: 'N/A', // Moralis doesn't provide liquidity in this endpoint
          last_updated: priceInfo.timestamp,
          token_address: priceInfo.tokenAddress,
          name: priceInfo.name,
          logo: null // Moralis doesn't provide logo in this endpoint
        },
        message: `Real-time price for ${priceInfo.symbol || token}`
      };

      res.json(response);
    } catch (error) {
      console.error('[PRICE] Quote error:', error);
      res.status(500).json({
        error: 'Failed to fetch price',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
