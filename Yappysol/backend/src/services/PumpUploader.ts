import FormData from 'form-data';
import { ImageFlow } from './ImageFlow';

export class PumpUploader {
  private pumpIpfsEndpoint: string;

  constructor() {
    this.pumpIpfsEndpoint = process.env.PUMP_IPFS_ENDPOINT || 'https://pump.fun/api/ipfs';
  }

  async uploadImage(imageUrl: string): Promise<{ hash: string; url: string }> {
    try {
      // Validate and normalize the image
      const isValid = await ImageFlow.validateImage(imageUrl);
      if (!isValid) {
        throw new Error('Invalid image URL or unsupported format');
      }

      const normalizedImage = await ImageFlow.normalizeImage(imageUrl);
      
      // Create form data
      const formData = new FormData();
      formData.append('file', normalizedImage, {
        filename: 'token-image.jpg',
        contentType: 'image/jpeg'
      });

      // Upload to Pump.fun IPFS
      const response = await fetch(this.pumpIpfsEndpoint, {
        method: 'POST',
        body: formData as any,
        headers: {
          ...formData.getHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        hash: result.hash || result.cid,
        url: `ipfs://${result.hash || result.cid}`
      };
    } catch (error) {
      console.error('[PUMPUPLOADER] Image upload error:', error);
      throw new Error(`Failed to upload image to IPFS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uploadMetadata(metadata: any): Promise<{ hash: string; url: string }> {
    try {
      // Create form data for metadata
      const formData = new FormData();
      formData.append('file', JSON.stringify(metadata, null, 2), {
        filename: 'metadata.json',
        contentType: 'application/json'
      });

      // Upload to Pump.fun IPFS
      const response = await fetch(this.pumpIpfsEndpoint, {
        method: 'POST',
        body: formData as any,
        headers: {
          ...formData.getHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        hash: result.hash || result.cid,
        url: `ipfs://${result.hash || result.cid}`
      };
    } catch (error) {
      console.error('[PUMPUPLOADER] Metadata upload error:', error);
      throw new Error(`Failed to upload metadata to IPFS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async uploadFile(fileBuffer: Buffer, filename: string, contentType: string): Promise<{ hash: string; url: string }> {
    try {
      const formData = new FormData();
      formData.append('file', fileBuffer, {
        filename: filename,
        contentType: contentType
      });

      const response = await fetch(this.pumpIpfsEndpoint, {
        method: 'POST',
        body: formData as any,
        headers: {
          ...formData.getHeaders()
        }
      });

      if (!response.ok) {
        throw new Error(`IPFS upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      return {
        hash: result.hash || result.cid,
        url: `ipfs://${result.hash || result.cid}`
      };
    } catch (error) {
      console.error('[PUMPUPLOADER] File upload error:', error);
      throw new Error(`Failed to upload file to IPFS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
