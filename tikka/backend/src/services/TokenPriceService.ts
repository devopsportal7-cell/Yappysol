import { getMoralis } from '../lib/moralis';
import dotenv from 'dotenv';

dotenv.config();

interface MoralisSolanaTokenPrice {
  tokenAddress: string;
  pairAddress: string;
  exchangeName: string;
  exchangeAddress: string;
  nativePrice: {
    value: string;
    symbol: string;
    name: string;
    decimals: number;
  };
  usdPrice: number;
  usdPrice24h: number;
  usdPrice24hrUsdChange: number;
  usdPrice24hrPercentChange: number;
  logo: string;
  name: string;
  symbol: string;
  isVerifiedContract: boolean;
}

interface TokenPrice {
  usdPrice: number;
  nativePrice: number | null;
  tokenAddress: string;
  timestamp: string;
  priceChange24h?: number;
  logo?: string;
  name?: string;
  symbol?: string;
}

interface TokenMetadata {
  name: string;
  symbol: string;
  mint: string;
  standard: string;
  tokenAddress: string;
}

interface PriceInfo {
  usdPrice: number;
  nativePrice: number | null;
  timestamp: string;
  tokenAddress: string;
  name: string;
  symbol: string;
  mint: string;
  standard: string;
}

// Common token addresses
const COMMON_TOKENS: { [key: string]: string } = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
};

export class TokenPriceService {
  private network: 'mainnet' | 'devnet';

  constructor() {
    this.network = 'mainnet';
  }

  private getTokenAddressFromQuery(query: string): string | null {
    // Convert query to uppercase for case-insensitive matching
    const upperQuery = query.toUpperCase();
    
    // Check for common token symbols
    for (const [symbol, address] of Object.entries(COMMON_TOKENS)) {
      if (upperQuery.includes(symbol)) {
        return address;
      }
    }

    // If no common token found, check if the query contains a Solana address
    const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
    const match = query.match(solanaAddressRegex);
    return match ? match[0] : null;
  }

  async handlePriceQuery(query: string): Promise<{ prompt: string }> {
    try {
      const tokenAddress = this.getTokenAddressFromQuery(query);
      if (!tokenAddress) {
        return { prompt: "I couldn't identify the token you're asking about. Please specify a token ticker (like SOL, BONK) or provide a valid contract address." };
      }
      const priceInfo = await this.getTokenPriceWithMetadata(tokenAddress);
      if (!priceInfo.usdPrice || priceInfo.nativePrice === null) {
        return { prompt: "Sorry, I couldn't get the price information for this token at the moment." };
      }
      const usd = Number(priceInfo.usdPrice);
      const sol = Number(priceInfo.nativePrice);
      const usdDisplay = usd < 0.01 ? usd.toFixed(8) : usd.toFixed(4);
      const solDisplay = sol < 0.01 ? sol.toFixed(8) : sol.toFixed(6);
      return {
        prompt: `The current price of ${priceInfo.symbol} is $${usdDisplay} USD (${solDisplay} SOL). [View on Solscan](https://solscan.io/token/${priceInfo.mint})`
      };
    } catch (error) {
      console.error('Error handling price query:', error);
      return { prompt: "Sorry, I couldn't fetch the price information at the moment. Please try again later." };
    }
  }

  async getTokenPrice(mint: string): Promise<TokenPrice> {
    try {
      const response = await getMoralis().SolApi.token.getTokenPrice({
        network: this.network,
        address: mint
      });

      console.log('Moralis response:', response); // Debug: log the full response

      if (response && response.raw) {
        const data = response.raw as MoralisSolanaTokenPrice;
        return {
          usdPrice: data.usdPrice || 0,
          priceChange24h: data.usdPrice24hrPercentChange || 0,
          logo: data.logo || '',
          name: data.name || '',
          symbol: data.symbol || '',
          nativePrice: data.nativePrice ? Number(data.nativePrice.value) / Math.pow(10, data.nativePrice.decimals) : null,
          timestamp: new Date().toISOString(),
          tokenAddress: mint
        };
      }
      return {
        usdPrice: 0,
        nativePrice: null,
        tokenAddress: mint,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error fetching token price:', error);
      return {
        usdPrice: 0,
        nativePrice: null,
        tokenAddress: mint,
        timestamp: new Date().toISOString()
      };
    }
  }

  async getTokenMetadata(tokenAddress: string): Promise<TokenMetadata> {
    try {
      const response = await getMoralis().SolApi.token.getTokenMetadata({
        network: this.network,
        address: tokenAddress,
      });

      const metadata = response.raw;
      return {
        name: metadata.name,
        symbol: metadata.symbol,
        mint: metadata.mint,
        standard: metadata.standard,
        tokenAddress,
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      throw new Error('Failed to fetch token metadata');
    }
  }

  async getTokenPriceWithMetadata(tokenAddress: string): Promise<PriceInfo> {
    try {
      const [price, metadata] = await Promise.all([
        this.getTokenPrice(tokenAddress),
        this.getTokenMetadata(tokenAddress),
      ]);

      return {
        ...price,
        ...metadata,
      };
    } catch (error) {
      console.error('Error fetching token price and metadata:', error);
      throw new Error('Failed to fetch token price and metadata');
    }
  }
} 