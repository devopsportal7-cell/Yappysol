import { Request, Response } from 'express';
import { TokenCreationService } from '../services/TokenCreationService';

export class LaunchController {
  static async init(req: Request, res: Response) {
    const { session_id, user_id, draft } = req.body;
    
    console.log('[LAUNCH] Init request:', { session_id, user_id, draft });
    
    try {
      const creationService = new TokenCreationService();
      
      // Validate required fields
      if (!draft?.token_name || !draft?.token_symbol) {
        return res.status(400).json({
          error: 'Missing required fields: token_name and token_symbol are required'
        });
      }

      // Use the same token creation logic as the original system
      const result = await creationService.createToken({
        name: draft.token_name,
        symbol: draft.token_symbol,
        description: draft.description || '',
        image: draft.image_url || '',
        website: draft.website || '',
        twitter: draft.twitter || '',
        telegram: draft.telegram || '',
        supply: draft.supply || '1000000',
        decimals: draft.decimals || 9,
        walletAddress: draft.wallet_address || 'default-wallet'
      });

      res.json({
        status: 'READY_FOR_SIGNATURE',
        confirm_text: `Launching ${draft.token_name} (${draft.token_symbol})`,
        sign: {
          provider: 'pump',
          transaction: result.unsignedTransaction,
          mintAddress: result.mint,
          token_name: draft.token_name,
          token_symbol: draft.token_symbol,
          description: draft.description,
          image_url: draft.image_url,
          website: draft.website,
          twitter: draft.twitter,
          telegram: draft.telegram,
          supply: draft.supply,
          decimals: draft.decimals
        },
        message: `Token creation ready for signature: ${draft.token_name}`
      });

    } catch (error) {
      console.error('[LAUNCH] Init error:', error);
      res.status(500).json({
        error: 'Failed to initialize token launch',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
