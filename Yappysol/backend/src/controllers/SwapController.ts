import { Request, Response } from 'express';
import { SwapService } from '../services/SwapService';

export class SwapController {
  static async resolve(req: Request, res: Response) {
    const { token_in, token_out } = req.body;
    
    console.log('[SWAP] Resolve request:', { token_in, token_out });
    
    try {
      const swapService = new SwapService();
      const result = await swapService.resolveTokens(token_in, token_out);
      
      res.json(result);
    } catch (error) {
      console.error('[SWAP] Resolve error:', error);
      res.status(500).json({
        error: 'Failed to resolve tokens'
      });
    }
  }

  static async quote(req: Request, res: Response) {
    const { token_in, token_out, amount_in } = req.body;
    
    console.log('[SWAP] Quote request:', { token_in, token_out, amount_in });
    
    try {
      const swapService = new SwapService();
      const result = await swapService.getQuote(token_in, token_out, amount_in);
      
      res.json(result);
    } catch (error) {
      console.error('[SWAP] Quote error:', error);
      res.status(500).json({
        error: 'Failed to get swap quote'
      });
    }
  }

  static async init(req: Request, res: Response) {
    const { token_in, token_out, amount_in, user_wallet } = req.body;
    
    console.log('[SWAP] Init request:', { token_in, token_out, amount_in, user_wallet });
    
    try {
      const swapService = new SwapService();
      const result = await swapService.initSwap(token_in, token_out, amount_in, user_wallet);
      
      res.json({
        status: 'READY_FOR_SIGNATURE',
        unsigned_tx: result.unsigned_tx || 'BASE64_TX_STUB',
        summary: 'Open your wallet to sign the swap transaction.',
        route_id: result.route_id,
        amount_out: result.amount_out,
        price_impact: result.price_impact
      });
    } catch (error) {
      console.error('[SWAP] Init error:', error);
      res.status(500).json({
        error: 'Failed to initialize swap'
      });
    }
  }
}
