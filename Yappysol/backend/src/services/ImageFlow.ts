import sharp from 'sharp';

export class ImageFlow {
  static async normalizeImage(imageUrl: string): Promise<Buffer> {
    try {
      // Fetch the image
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      
      // Process with sharp
      const processedBuffer = await sharp(imageBuffer)
        .resize(512, 512, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 90 })
        .toBuffer();
      
      return processedBuffer;
    } catch (error) {
      console.error('[IMAGEFLOW] Error normalizing image:', error);
      throw new Error(`Failed to normalize image: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  static async validateImage(imageUrl: string): Promise<boolean> {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      if (!response.ok) {
        return false;
      }
      
      const contentType = response.headers.get('content-type');
      const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      
      return validTypes.includes(contentType || '');
    } catch (error) {
      console.error('[IMAGEFLOW] Error validating image:', error);
      return false;
    }
  }

  static async getImageMetadata(imageUrl: string): Promise<{
    width: number;
    height: number;
    format: string;
    size: number;
  }> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }
      
      const imageBuffer = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(imageBuffer).metadata();
      
      return {
        width: metadata.width || 0,
        height: metadata.height || 0,
        format: metadata.format || 'unknown',
        size: imageBuffer.length
      };
    } catch (error) {
      console.error('[IMAGEFLOW] Error getting image metadata:', error);
      throw new Error(`Failed to get image metadata: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
