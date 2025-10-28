import { logger } from '../utils/logger';

export interface HeliusTokenBalance {
  mint: string;
  owner: string;
  amount: string;
  decimals: number;
  uiAmount: number;
  uiAmountString: string;
  symbol?: string;
  name?: string;
  image?: string;
  price?: number;
}

export interface HeliusWalletPortfolio {
  totalSolValue: number;
  totalUsdValue: number;
  tokens: Array<{
    mint: string;
    symbol: string;
    name?: string;
    accountUnit: string;
    uiAmount: number;
    priceUsd: number;
    solEquivalent: number;
    usdEquivalent: number;
    image?: string;
    solscanUrl: string;
    decimals: number;
  }>;
}

export class HeliusBalanceService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.HELIUS_API_KEY || '';
    this.baseUrl = process.env.HELIUS_BASE_URL || 'https://api.helius.xyz';
    
    if (!this.apiKey) {
      logger.warn('[HELIUS] HELIUS_API_KEY not configured');
    }
  }

  /**
   * Get wallet portfolio from Helius API
   */
  async getWalletPortfolio(walletAddress: string): Promise<HeliusWalletPortfolio> {
    try {
      logger.info('[HELIUS] Fetching wallet portfolio', { walletAddress });

      // Get token balances
      const tokenBalances = await this.getTokenBalances(walletAddress);
      
      // Get SOL balance
      const solBalance = await this.getSolBalance(walletAddress);
      
      // Get SOL price for USD conversion
      const solPrice = await this.getSolPrice();
      
      // Calculate totals
      let totalSolValue = solBalance;
      let totalUsdValue = solBalance * solPrice; // Convert SOL to USD

      const processedTokens = [];

      // Add native SOL as first token if balance > 0
      if (solBalance > 0) {
        processedTokens.push({
          mint: 'So11111111111111111111111111111111111111112',
          symbol: 'SOL',
          name: 'Solana',
          accountUnit: String(Math.round(solBalance * 1e9)),
          uiAmount: solBalance,
          priceUsd: solPrice,
          solEquivalent: solBalance,
          usdEquivalent: solBalance * solPrice,
          image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
          solscanUrl: 'https://solscan.io/token/So11111111111111111111111111111111111111112',
          decimals: 9
        });
      }

      // Ensure tokenBalances is iterable
      if (!Array.isArray(tokenBalances)) {
        logger.warn('[HELIUS] tokenBalances is not iterable', { tokenBalances, walletAddress });
        return {
          totalSolValue: solBalance,
          totalUsdValue: solBalance * solPrice,
          tokens: processedTokens
        };
      }

      // Import services for enriching token data
      const { TokenMetadataService } = await import('./TokenMetadataService');
      const { getMoralis } = await import('../lib/moralis');
      const moralis = getMoralis();
      
      for (const token of tokenBalances) {
        // Calculate uiAmount if not present
        let uiAmount = token.uiAmount;
        if (!uiAmount && token.amount && token.decimals !== undefined) {
          uiAmount = Number(token.amount) / Math.pow(10, token.decimals);
          logger.info('[HELIUS] Calculated uiAmount', { 
            mint: token.mint, 
            uiAmount,
            amount: token.amount,
            decimals: token.decimals 
          });
        }
        
        if (!uiAmount || uiAmount === 0) {
          logger.warn('[HELIUS] Skipping token with zero or missing balance', { mint: token.mint });
          continue; // Skip tokens with zero balance
        }
        
        // Step 1: Check if it's a stablecoin first (USDC/USDT hardcoded to $1.00)
        let priceUsd = 0;
        if (TokenMetadataService.isStablecoin(token.mint)) {
          priceUsd = 1.0;
          logger.info('[HELIUS] Using stablecoin price', { mint: token.mint, priceUsd: 1.0 });
        } else {
          // Step 2: Get price from Moralis for SPL tokens
          try {
            const priceResponse = await moralis.SolApi.token.getTokenPrice({
              network: 'mainnet',
              address: token.mint
            });
            priceUsd = priceResponse?.raw?.usdPrice || 0;
            
            if (priceUsd > 0) {
              logger.info('[HELIUS] Price from Moralis', { mint: token.mint, priceUsd });
            } else {
              logger.warn('[HELIUS] Moralis returned 0 price', { mint: token.mint });
            }
          } catch (error) {
            logger.error('[HELIUS] Moralis API failed', { 
              error: error instanceof Error ? error.message : error,
              mint: token.mint 
            });
            priceUsd = 0;
          }
        }
        
        // Step 3: Enrich with metadata
        const enrichedToken = TokenMetadataService.enrichToken(token);
        
        // Calculate values
        const usdEquivalent = uiAmount * priceUsd;
        const solEquivalent = usdEquivalent / solPrice;

        totalSolValue += solEquivalent;
        totalUsdValue += usdEquivalent;

        processedTokens.push({
          mint: token.mint,
          symbol: enrichedToken.symbol || 'UNKNOWN',
          name: enrichedToken.name || (enrichedToken.symbol),
          accountUnit: token.mint,
          uiAmount: uiAmount,
          priceUsd,
          solEquivalent,
          usdEquivalent,
          image: enrichedToken.image || token.image,
          solscanUrl: `https://solscan.io/token/${token.mint}`,
          decimals: token.decimals
        });
        
        logger.info('[HELIUS] Token processed', { 
          symbol: enrichedToken.symbol, 
          uiAmount,
          priceUsd,
          usdEquivalent,
          solEquivalent
        });
      }

      // Sort tokens by USD value (descending)
      processedTokens.sort((a, b) => b.usdEquivalent - a.usdEquivalent);

      logger.info('[HELIUS] Portfolio fetched successfully', {
        walletAddress,
        totalSolValue,
        totalUsdValue,
        tokenCount: processedTokens.length
      });

      return {
        totalSolValue,
        totalUsdValue,
        tokens: processedTokens
      };
    } catch (error) {
      logger.error('[HELIUS] Error fetching wallet portfolio', { error, walletAddress });
      throw error;
    }
  }

  /**
   * Get token balances for a wallet
   */
  private async getTokenBalances(walletAddress: string): Promise<HeliusTokenBalance[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v0/addresses/${walletAddress}/balances?api-key=${this.apiKey}`
      );

      if (!response.ok) {
        logger.error('[HELIUS] API error', { 
          status: response.status, 
          statusText: response.statusText,
          walletAddress 
        });
        return [];
      }

      const data = await response.json();
      
      // Handle case where API returns empty or invalid data
      if (!data || typeof data !== 'object') {
        logger.warn('[HELIUS] Invalid token balances response', { data, walletAddress });
        return [];
      }

      // Helius returns { nativeBalance: 62477480, tokens: [...] }
      // Extract the tokens array
      if (data.tokens && Array.isArray(data.tokens)) {
        return data.tokens;
      }

      return [];
    } catch (error) {
      logger.error('[HELIUS] Error fetching token balances', { error, walletAddress });
      return [];
    }
  }

  /**
   * Get SOL balance for a wallet
   */
  private async getSolBalance(walletAddress: string): Promise<number> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v0/addresses/${walletAddress}/balances?api-key=${this.apiKey}`
      );

      if (!response.ok) {
        logger.error('[HELIUS] API error for SOL balance', { 
          status: response.status, 
          statusText: response.statusText,
          walletAddress 
        });
        return 0;
      }

      const data = await response.json();
      
      // Handle case where API returns empty or invalid data
      if (!data || typeof data !== 'object') {
        logger.warn('[HELIUS] Invalid SOL balance response', { data, walletAddress });
        return 0;
      }
      
      // Helius returns { nativeBalance: 62477480, tokens: [...] }
      // Convert lamports to SOL (lamports / 1e9)
      if (data.nativeBalance !== undefined) {
        return data.nativeBalance / 1e9;
      }
      
      return 0;
    } catch (error) {
      logger.error('[HELIUS] Error fetching SOL balance', { error, walletAddress });
      return 0;
    }
  }

  /**
   * Get token price from Helius (public method)
   */
  async getTokenPrice(tokenMint: string): Promise<number> {
    try {
      // Use a simple price service - you might want to implement a more sophisticated one
      const response = await fetch(
        `${this.baseUrl}/v0/token-metadata?api-key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mintAccounts: [tokenMint]
          })
        }
      );

      if (!response.ok) {
        logger.warn('[HELIUS] Error fetching token metadata', { tokenMint });
        return 0;
      }

      const data = await response.json();
      const tokenData = data[0];

      // Return price if available, otherwise 0
      return tokenData?.price || 0;
    } catch (error) {
      logger.warn('[HELIUS] Error getting token price', { error, tokenMint });
      return 0;
    }
  }

  /**
   * Get SOL price in USD from Binance API
   */
  private async getSolPrice(): Promise<number> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const binanceResponse = await fetch(
        'https://api.binance.com/api/v3/ticker/price?symbol=SOLUSDT',
        {
          headers: {
            'Accept': 'application/json'
          },
          signal: controller.signal
        }
      );
      
      clearTimeout(timeoutId);

      if (binanceResponse.ok) {
        const data = await binanceResponse.json();
        const price = parseFloat(data.price);
        
        if (price && price > 0) {
          logger.info('[HELIUS] SOL price fetched from Binance', { price });
          return price;
        } else {
          logger.warn('[HELIUS] Binance returned invalid price', { data });
          throw new Error('Binance returned invalid price');
        }
      } else {
        logger.error('[HELIUS] Binance API error', { 
          status: binanceResponse.status, 
          statusText: binanceResponse.statusText 
        });
        throw new Error(`Binance API error: ${binanceResponse.status}`);
      }
    } catch (error) {
      logger.error('[HELIUS] Failed to fetch SOL price from Binance', { 
        error: error instanceof Error ? error.message : error 
      });
      // Don't use fallback - throw error instead
      throw new Error('Failed to fetch SOL price from Binance');
    }
  }

  /**
   * Get recent transactions for a wallet
   */
  async getRecentTransactions(walletAddress: string, limit: number = 50): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v0/addresses/${walletAddress}/transactions?api-key=${this.apiKey}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const transactions = await response.json();
      return transactions || [];
    } catch (error) {
      logger.error('[HELIUS] Error fetching recent transactions', { error, walletAddress });
      return [];
    }
  }

  /**
   * Get transaction details
   */
  async getTransaction(signature: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v0/transactions?api-key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transactions: [signature]
          })
        }
      );

      if (!response.ok) {
        throw new Error(`Helius API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      return data[0] || null;
    } catch (error) {
      logger.error('[HELIUS] Error fetching transaction', { error, signature });
      return null;
    }
  }

  /**
   * Health check for Helius API
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/v0/addresses/11111111111111111111111111111112/balances?api-key=${this.apiKey}`
      );

      return response.ok;
    } catch (error) {
      logger.error('[HELIUS] Health check failed', { error });
      return false;
    }
  }
}

export const heliusBalanceService = new HeliusBalanceService(); 