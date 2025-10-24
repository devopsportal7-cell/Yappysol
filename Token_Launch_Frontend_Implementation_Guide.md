# Token Launch Frontend Implementation Guide

## Overview
This guide provides comprehensive instructions for implementing token launch tracking, price monitoring, and portfolio integration in the frontend.

## Database Schema
First, run the SQL schema in your Supabase SQL editor:
```sql
-- See Token_Launch_Database_Schema.sql for complete schema
```

## API Endpoints Available

### Token Launch Management
- `GET /api/chat/launches` - Get all user launches
- `GET /api/chat/launches/:id` - Get specific launch
- `GET /api/chat/launches/stats` - Get launch statistics
- `GET /api/chat/launches/top-performers` - Get top performing tokens
- `GET /api/chat/launches/recent` - Get recent launches
- `PUT /api/chat/launches/:id` - Update launch
- `DELETE /api/chat/launches/:id` - Delete launch

### Price & Portfolio
- `GET /api/chat/launches/:id/price-history` - Get price history
- `GET /api/chat/holdings` - Get user token holdings
- `GET /api/chat/portfolio/value` - Get portfolio value
- `POST /api/chat/launches/update-prices` - Manual price update
- `POST /api/chat/holdings/update` - Manual holdings update

## Frontend Implementation

### 1. TypeScript Interfaces

```typescript
interface TokenLaunch {
  id: string;
  user_id: string;
  session_id?: string;
  
  // Token Details
  token_name: string;
  token_symbol: string;
  description?: string;
  image_url?: string;
  
  // Social Links
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
  
  // Launch Configuration
  pool_type: 'pump' | 'bonk';
  launch_amount: number;
  initial_supply?: number;
  decimals?: number;
  
  // Transaction Details
  mint_address?: string;
  transaction_signature?: string;
  unsigned_transaction?: string;
  
  // Price & Market Data
  current_price_usd?: number;
  market_cap_usd?: number;
  price_change_24h?: number;
  volume_24h_usd?: number;
  liquidity_usd?: number;
  holders_count?: number;
  
  // Status Tracking
  status: 'draft' | 'pending' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
  last_price_update?: string;
}

interface TokenPrice {
  id: string;
  token_launch_id: string;
  mint_address: string;
  price_usd: number;
  market_cap_usd: number;
  volume_24h_usd: number;
  liquidity_usd: number;
  holders_count: number;
  price_change_24h: number;
  recorded_at: string;
}

interface UserTokenHolding {
  id: string;
  user_id: string;
  token_launch_id?: string;
  mint_address: string;
  balance: number;
  balance_usd: number;
  first_acquired_at: string;
  last_updated_at: string;
  created_at: string;
  updated_at: string;
  token_launches?: {
    token_name: string;
    token_symbol: string;
    image_url?: string;
    current_price_usd?: number;
    market_cap_usd?: number;
    price_change_24h?: number;
  };
}

interface LaunchStats {
  total: number;
  completed: number;
  failed: number;
  pending: number;
  totalValueUsd: number;
  averagePriceUsd: number;
  bestPerformer?: TokenLaunch;
  worstPerformer?: TokenLaunch;
}
```

### 2. API Service Functions

```typescript
class TokenLaunchService {
  private baseUrl = '/api/chat';
  private authToken: string;

  constructor(authToken: string) {
    this.authToken = authToken;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    return response.json();
  }

  // Get all launches
  async getLaunches(limit?: number): Promise<{ launches: TokenLaunch[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/launches${params}`);
  }

  // Get specific launch
  async getLaunch(id: string): Promise<{ launch: TokenLaunch }> {
    return this.request(`/launches/${id}`);
  }

  // Get launch statistics
  async getStats(): Promise<{ stats: LaunchStats }> {
    return this.request('/launches/stats');
  }

  // Get top performers
  async getTopPerformers(limit?: number): Promise<{ performers: TokenLaunch[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/launches/top-performers${params}`);
  }

  // Get recent launches
  async getRecentLaunches(limit?: number): Promise<{ launches: TokenLaunch[] }> {
    const params = limit ? `?limit=${limit}` : '';
    return this.request(`/launches/recent${params}`);
  }

  // Get price history
  async getPriceHistory(launchId: string, days?: number): Promise<{ priceHistory: TokenPrice[] }> {
    const params = days ? `?days=${days}` : '';
    return this.request(`/launches/${launchId}/price-history${params}`);
  }

  // Update launch
  async updateLaunch(id: string, updates: Partial<TokenLaunch>): Promise<{ launch: TokenLaunch }> {
    return this.request(`/launches/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates)
    });
  }

  // Delete launch
  async deleteLaunch(id: string): Promise<{ success: boolean }> {
    return this.request(`/launches/${id}`, {
      method: 'DELETE'
    });
  }

  // Get holdings
  async getHoldings(): Promise<{ holdings: UserTokenHolding[] }> {
    return this.request('/holdings');
  }

  // Get portfolio value
  async getPortfolioValue(): Promise<{
    totalValueUsd: number;
    totalTokens: number;
    holdings: UserTokenHolding[];
  }> {
    return this.request('/portfolio/value');
  }

  // Update prices
  async updatePrices(): Promise<{ success: boolean; message: string }> {
    return this.request('/launches/update-prices', {
      method: 'POST'
    });
  }

  // Update holdings
  async updateHoldings(): Promise<{ success: boolean; message: string }> {
    return this.request('/holdings/update', {
      method: 'POST'
    });
  }
}
```

### 3. React Components

#### Token Launch History Component

```typescript
import React, { useState, useEffect } from 'react';

interface TokenLaunchHistoryProps {
  authToken: string;
}

const TokenLaunchHistory: React.FC<TokenLaunchHistoryProps> = ({ authToken }) => {
  const [launches, setLaunches] = useState<TokenLaunch[]>([]);
  const [stats, setStats] = useState<LaunchStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const launchService = new TokenLaunchService(authToken);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [launchesData, statsData] = await Promise.all([
        launchService.getLaunches(20),
        launchService.getStats()
      ]);
      
      setLaunches(launchesData.launches);
      setStats(statsData.stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number | undefined) => {
    if (!price) return 'N/A';
    return `$${price.toFixed(6)}`;
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1000000) {
      return `$${(marketCap / 1000000).toFixed(2)}M`;
    }
    return `$${marketCap.toFixed(2)}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'pending': return 'text-yellow-600';
      case 'draft': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getPriceChangeColor = (change: number | undefined) => {
    if (!change) return 'text-gray-600';
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
        <button 
          onClick={loadData}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Launches</h3>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Completed</h3>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Total Value</h3>
            <p className="text-2xl font-bold text-blue-600">
              ${stats.totalValueUsd.toFixed(2)}
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-sm font-medium text-gray-500">Avg Price</h3>
            <p className="text-2xl font-bold text-purple-600">
              ${stats.averagePriceUsd.toFixed(6)}
            </p>
          </div>
        </div>
      )}

      {/* Launches List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Token Launches</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {launches.map((launch) => (
            <div key={launch.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {launch.image_url && (
                    <img 
                      src={launch.image_url} 
                      alt={launch.token_name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">
                      {launch.token_name}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {launch.token_symbol} • {launch.pool_type}
                    </p>
                    {launch.description && (
                      <p className="text-sm text-gray-600 mt-1">
                        {launch.description}
                      </p>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="flex items-center space-x-4">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {formatPrice(launch.current_price_usd)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatMarketCap(launch.market_cap_usd)}
                      </p>
                    </div>
                    
                    {launch.price_change_24h !== undefined && (
                      <div className="text-right">
                        <p className={`text-sm font-medium ${getPriceChangeColor(launch.price_change_24h)}`}>
                          {launch.price_change_24h >= 0 ? '+' : ''}{launch.price_change_24h.toFixed(2)}%
                        </p>
                        <p className="text-xs text-gray-500">24h</p>
                      </div>
                    )}
                    
                    <div className="text-right">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(launch.status)}`}>
                        {launch.status}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(launch.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="mt-2 flex space-x-2">
                    {launch.mint_address && (
                      <a
                        href={`https://solscan.io/token/${launch.mint_address}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View Token
                      </a>
                    )}
                    {launch.transaction_signature && (
                      <a
                        href={`https://solscan.io/tx/${launch.transaction_signature}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        View TX
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TokenLaunchHistory;
```

#### Portfolio Component

```typescript
import React, { useState, useEffect } from 'react';

interface PortfolioProps {
  authToken: string;
}

const Portfolio: React.FC<PortfolioProps> = ({ authToken }) => {
  const [holdings, setHoldings] = useState<UserTokenHolding[]>([]);
  const [portfolioValue, setPortfolioValue] = useState<{
    totalValueUsd: number;
    totalTokens: number;
    holdings: UserTokenHolding[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const launchService = new TokenLaunchService(authToken);

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      setLoading(true);
      const portfolio = await launchService.getPortfolioValue();
      setPortfolioValue(portfolio);
      setHoldings(portfolio.holdings);
    } catch (error) {
      console.error('Error loading portfolio:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number) => {
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(2)}K`;
    }
    return balance.toFixed(2);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Summary */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Portfolio Value</h2>
        <p className="text-3xl font-bold">${portfolioValue?.totalValueUsd.toFixed(2)}</p>
        <p className="text-blue-100">{portfolioValue?.totalTokens} tokens</p>
      </div>

      {/* Holdings List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Token Holdings</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {holdings.map((holding) => (
            <div key={holding.id} className="px-6 py-4 hover:bg-gray-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  {holding.token_launches?.image_url && (
                    <img 
                      src={holding.token_launches.image_url} 
                      alt={holding.token_launches.token_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {holding.token_launches?.token_name || 'Unknown Token'}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {holding.token_launches?.token_symbol || 'N/A'}
                    </p>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="font-medium text-gray-900">
                    {formatBalance(holding.balance)}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${holding.balance_usd.toFixed(2)}
                  </p>
                  {holding.token_launches?.price_change_24h !== undefined && (
                    <p className={`text-xs ${
                      holding.token_launches.price_change_24h >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {holding.token_launches.price_change_24h >= 0 ? '+' : ''}
                      {holding.token_launches.price_change_24h.toFixed(2)}%
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
```

### 4. Integration with Existing Chat

Update your chat response handling to include launch data:

```typescript
// In your chat message handler
const handleChatResponse = (response: any) => {
  if (response.action === 'token-creation') {
    // Show success message
    addMessage(response.prompt, 'assistant');
    
    // If launch was successful, refresh launch history
    if (response.launchId) {
      refreshLaunchHistory();
    }
    
    // If mint address is available, show token links
    if (response.mint) {
      showTokenLinks(response.mint);
    }
  }
};
```

### 5. Navigation Integration

Add token launch history to your navigation:

```typescript
// In your main navigation component
const Navigation = () => {
  const [activeTab, setActiveTab] = useState('chat');
  
  return (
    <div className="flex space-x-1">
      <button 
        onClick={() => setActiveTab('chat')}
        className={`px-4 py-2 rounded ${activeTab === 'chat' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Chat
      </button>
      <button 
        onClick={() => setActiveTab('launches')}
        className={`px-4 py-2 rounded ${activeTab === 'launches' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        My Launches
      </button>
      <button 
        onClick={() => setActiveTab('portfolio')}
        className={`px-4 py-2 rounded ${activeTab === 'portfolio' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
      >
        Portfolio
      </button>
    </div>
  );
};
```

## Implementation Checklist

- [ ] Run database schema in Supabase
- [ ] Add TypeScript interfaces
- [ ] Create TokenLaunchService class
- [ ] Implement TokenLaunchHistory component
- [ ] Implement Portfolio component
- [ ] Add navigation tabs
- [ ] Update chat response handling
- [ ] Test API endpoints
- [ ] Add error handling
- [ ] Add loading states
- [ ] Test with real token launches

## Features Included

✅ **Complete Launch Tracking**: All token launches saved to database
✅ **Price Monitoring**: Real-time price updates via Moralis/DexScreener
✅ **Portfolio Integration**: User holdings tracked and displayed
✅ **Launch History**: Complete history of all user launches
✅ **Statistics**: Success rates, total value, performance metrics
✅ **Price History**: Historical price data for analysis
✅ **Error Tracking**: Failed launches with error messages
✅ **Transaction Links**: Direct links to Solscan for verification
✅ **Status Tracking**: Draft → Pending → Completed/Failed flow
✅ **Social Links**: Twitter, Telegram, Website integration
✅ **Market Data**: Market cap, volume, liquidity, holders count

This implementation provides a complete token launch tracking system with price monitoring and portfolio integration, giving users full visibility into their token creation activities and performance.
