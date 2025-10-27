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
  'WIF': 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  'JUP': 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  'JTO': 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  'SAMO': '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
};

export class TokenPriceService {
  private network: 'mainnet' | 'devnet';

  constructor() {
    this.network = 'mainnet';
  }

  // Get token address from symbol
  getTokenAddress(symbol: string): string | null {
    const upperSymbol = symbol.toUpperCase();
    return COMMON_TOKENS[upperSymbol] || null;
  }

  // Get all recognized tokens
  getAllTokenSymbols(): string[] {
    return Object.keys(COMMON_TOKENS);
  }

  // Fetch price for a single token
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

  // Fetch prices for multiple tokens
  async getMultipleTokenPrices(symbols: string[]): Promise<PriceInfo[]> {
    const addresses = symbols
      .map(symbol => this.getTokenAddress(symbol))
      .filter(addr => addr !== null) as string[];

    const prices = await Promise.all(
      addresses.map(addr => this.getTokenPriceWithMetadata(addr))
    );

    return prices;
  }

  // Legacy method for backwards compatibility
  async handlePriceQuery(query: string): Promise<{ prompt: string }> {
    try {
      const tokenAddresses = this.getMultipleTokenAddressesFromQuery(query);
      
      if (tokenAddresses.length === 0) {
        return { prompt: "I couldn't identify any tokens in your query. Please specify token tickers (like SOL, BONK) or provide valid contract addresses." };
      }

      // Single token query
      const tokenAddress = tokenAddresses[0];
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

  private getMultipleTokenAddressesFromQuery(query: string): string[] {
    const upperQuery = query.toUpperCase();
    const foundTokens: string[] = [];
    
    // Check for common token symbols
    for (const [symbol, address] of Object.entries(COMMON_TOKENS)) {
      if (upperQuery.includes(symbol) && !foundTokens.includes(address)) {
        foundTokens.push(address);
      }
    }

    // If no common tokens found, check if the query contains Solana addresses
    const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
    const matches = query.match(solanaAddressRegex);
    if (matches) {
      matches.forEach(addr => {
        if (!foundTokens.includes(addr)) {
          foundTokens.push(addr);
        }
      });
    }
    
    return foundTokens;
  }

  async getTokenPrice(mint: string): Promise<TokenPrice> {
    try {
      const response = await getMoralis().SolApi.token.getTokenPrice({
        network: this.network,
        address: mint
      });

      console.log('Moralis response:', response);

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
} 