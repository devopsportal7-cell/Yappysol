import axios from 'axios';

export class TrendingService {
  async getTrending(limit = 10) {
    try {
      console.log('[TrendingService] Fetching trending tokens...');
      const url = 'https://api.dexscreener.com/latest/dex/tokens/trending';
      const response = await axios.get(url);
      console.log('[TrendingService] API response:', response.data);
      
      const pairs = response.data.pairs?.slice(0, limit) || [];
      console.log('[TrendingService] Found pairs:', pairs.length);
      
      return pairs;
    } catch (error) {
      console.error('[TrendingService] Error fetching trending tokens:', error);
      return [];
    }
  }
} 