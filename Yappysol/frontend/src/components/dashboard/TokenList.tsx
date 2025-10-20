import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, ExternalLink } from 'lucide-react';

interface Token {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  balance: number;
  value: number;
  logoUrl?: string;
  mint: string;
}

interface TokenListProps {
  tokens?: Token[];
  title?: string;
  description?: string;
}

const TokenList: React.FC<TokenListProps> = ({ 
  tokens = [], 
  title = 'Your Tokens',
  description = 'Your current token holdings'
}) => {
  // Mock data for demonstration
  const mockTokens: Token[] = [
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 98.45,
      change24h: 2.34,
      balance: 12.5,
      value: 1230.63,
      mint: 'So11111111111111111111111111111111111111112'
    },
    {
      symbol: 'BONK',
      name: 'Bonk',
      price: 0.0000234,
      change24h: -5.67,
      balance: 1250000,
      value: 29.25,
      mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263'
    },
    {
      symbol: 'USDC',
      name: 'USD Coin',
      price: 1.00,
      change24h: 0.01,
      balance: 500,
      value: 500.00,
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
    },
    {
      symbol: 'RAY',
      name: 'Raydium',
      price: 2.34,
      change24h: 8.45,
      balance: 50,
      value: 117.00,
      mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R'
    }
  ];

  const displayTokens = tokens.length > 0 ? tokens : mockTokens;

  return (
    <Card className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm border-orange-200/50 dark:border-orange-800/50">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {displayTokens.map((token, index) => {
            const isPositive = token.change24h >= 0;
            const isLargeBalance = token.balance > 1000;
            
            return (
              <div
                key={token.mint}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors group"
              >
                <div className="flex items-center gap-3 flex-1">
                  {/* Token Logo */}
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-sm">
                    {token.logoUrl ? (
                      <img src={token.logoUrl} alt={token.symbol} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      token.symbol.slice(0, 2)
                    )}
                  </div>
                  
                  {/* Token Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {token.symbol}
                      </h3>
                      <Badge variant="outline" className="text-xs">
                        {token.name}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                      Balance: {isLargeBalance ? (token.balance / 1000).toFixed(1) + 'K' : token.balance.toFixed(2)}
                    </p>
                  </div>
                </div>
                
                {/* Price and Change */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 dark:text-white">
                      ${token.price.toFixed(token.price < 1 ? 6 : 2)}
                    </span>
                    <div className={`flex items-center gap-1 text-xs ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                      {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                      <span>{Math.abs(token.change24h).toFixed(2)}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    ${token.value.toFixed(2)}
                  </p>
                </div>
                
                {/* External Link */}
                <button 
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-orange-100 dark:hover:bg-orange-800/30 rounded"
                  onClick={() => window.open(`https://solscan.io/token/${token.mint}`, '_blank')}
                >
                  <ExternalLink className="h-4 w-4 text-gray-500" />
                </button>
              </div>
            );
          })}
          
          {displayTokens.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No tokens found</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default TokenList;



