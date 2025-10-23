import { Request, Response } from 'express';
import { PumpUploader } from '../services/PumpUploader';

export class LaunchController {
  static async init(req: Request, res: Response) {
    const { session_id, user_id, draft } = req.body;
    
    console.log('[LAUNCH] Init request:', { session_id, user_id, draft });
    
    try {
      // Validate required fields
      if (!draft?.token_name || !draft?.token_symbol) {
        return res.status(400).json({
          error: 'Missing required fields: token_name and token_symbol are required'
        });
      }

      // Upload image to IPFS if provided
      let imageUrl = draft.image_url;
      if (draft.image_url && !draft.image_url.startsWith('ipfs://')) {
        try {
          const pumpUploader = new PumpUploader();
          const ipfsResult = await pumpUploader.uploadImage(draft.image_url);
          imageUrl = `ipfs://${ipfsResult.hash}`;
        } catch (error) {
          console.error('[LAUNCH] Image upload failed:', error);
          // Continue without image upload
        }
      }

      // Create metadata
      const metadata = {
        name: draft.token_name,
        symbol: draft.token_symbol,
        description: draft.description || '',
        image: imageUrl,
        external_url: draft.website || '',
        attributes: [
          {
            trait_type: 'Website',
            value: draft.website || ''
          },
          {
            trait_type: 'Twitter',
            value: draft.twitter || ''
          },
          {
            trait_type: 'Telegram',
            value: draft.telegram || ''
          }
        ]
      };

      // Upload metadata to IPFS
      let metadataUri = '';
      try {
        const pumpUploader = new PumpUploader();
        const metadataResult = await pumpUploader.uploadMetadata(metadata);
        metadataUri = `ipfs://${metadataResult.hash}`;
      } catch (error) {
        console.error('[LAUNCH] Metadata upload failed:', error);
        return res.status(500).json({
          error: 'Failed to upload metadata to IPFS'
        });
      }

      // TODO: Replace with actual transaction builder
      // For now, return ready for signature
      res.json({
        status: 'READY_FOR_SIGNATURE',
        confirm_text: `Launching ${draft.token_name} (${draft.token_symbol})`,
        sign: {
          provider: 'pump',
          metadataUri: metadataUri,
          token_name: draft.token_name,
          token_symbol: draft.token_symbol,
          description: draft.description,
          image_url: imageUrl,
          website: draft.website,
          twitter: draft.twitter,
          telegram: draft.telegram
        }
      });

    } catch (error) {
      console.error('[LAUNCH] Init error:', error);
      res.status(500).json({
        error: 'Failed to initialize token launch'
      });
    }
  }
}
