# 🚀 External Wallet Deposit Balance System - Implementation Guide

## 📋 Overview

This system provides **real-time balance updates** when users receive deposits from external wallets (outside your platform) into their connected wallets. It ensures seamless user experience with instant notifications and accurate balance tracking.

## 🏗️ Architecture

### Core Components
1. **ExternalTransactionService** - Detects and processes external deposits
2. **BalanceCacheService** - Manages cached wallet balances for performance
3. **WebSocketBalanceSubscriber** - Real-time Solana blockchain monitoring
4. **HeliusBalanceService** - Solana blockchain data provider
5. **Server-Sent Events (SSE)** - Real-time frontend notifications
6. **BackgroundBalanceUpdateService** - Periodic balance refresh

### Data Flow
```
External Deposit → WebSocket Detection → External Transaction Service → Balance Cache Update → SSE Notification → Frontend Update
```

## 🗄️ Database Setup

### 1. Run the Database Schema
Execute the SQL script in your Supabase dashboard:

```sql
-- Run External_Wallet_Deposit_Schema.sql
-- This creates all necessary tables and indexes
```

### 2. Verify Tables Created
- `external_transactions` - Stores external wallet transactions
- `wallet_balance_cache` - Caches total wallet balances
- `token_balance_cache` - Caches individual token balances
- `balance_update_events` - Tracks balance update events
- `platform_wallets` - Identifies platform-owned wallets

## 🔧 Backend Implementation

### 1. Install Required Dependencies
```bash
npm install ws p-queue winston
npm install --save-dev @types/ws
```

### 2. Environment Variables (Doppler)
Add these to your Doppler configuration:

```bash
# Required
HELIUS_API_KEY=your_helius_api_key
HELIUS_BASE_URL=https://api.helius.xyz
HELIUS_WSS_URL=wss://api.helius.xyz/v0/websocket
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Performance Tuning
PORTFOLIO_CONCURRENCY=6
WALLET_REFRESH_DEBOUNCE_MS=800
IMMEDIATE_REFRESH_MS=100
BACKGROUND_UPDATE_INTERVAL_MS=30000

# Logging
LOG_LEVEL=info
NODE_ENV=production
```

### 3. Files Added/Modified

**New Services:**
- `src/services/ExternalTransactionService.ts`
- `src/services/BalanceCacheService.ts`
- `src/services/HeliusBalanceService.ts`
- `src/services/WebsocketBalanceSubscriber.ts`
- `src/services/BackgroundBalanceUpdateService.ts`

**New Utilities:**
- `src/lib/portfolio-refresh.ts`
- `src/lib/events.ts`
- `src/utils/logger.ts`

**New Routes:**
- `src/routes/walletBalance.ts`

**Modified Files:**
- `src/app.ts` - Added new routes and service initialization
- `src/lib/supabase.ts` - Added new table names

### 4. Service Initialization
The services are automatically initialized when the app starts:

```typescript
// Background balance update service starts
// WebSocket subscriber connects to Helius
// External transaction service loads platform wallets
```

## 🌐 API Endpoints

### Wallet Balance Management

#### Get Wallet Balance (Cached)
```http
GET /api/wallet/:address/balance
Authorization: Bearer <jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "totalSolValue": 1.5,
    "totalUsdValue": 150.0,
    "tokens": [
      {
        "mint": "So11111111111111111111111111111111111111112",
        "symbol": "SOL",
        "name": "Solana",
        "uiAmount": 1.5,
        "priceUsd": 100,
        "solEquivalent": 1.5,
        "usdEquivalent": 150.0,
        "solscanUrl": "https://solscan.io/token/...",
        "decimals": 9
      }
    ]
  }
}
```

#### Get Transaction History
```http
GET /api/wallet/:address/history?page=1&limit=50
Authorization: Bearer <jwt_token>
```

#### Get External Transactions Only
```http
GET /api/wallet/:address/external-transactions?page=1&limit=50
Authorization: Bearer <jwt_token>
```

#### Force Refresh Wallet Balance
```http
POST /api/wallet/:address/refresh
Authorization: Bearer <jwt_token>
```

#### Subscribe to Wallet Updates
```http
POST /api/wallet/:address/subscribe
Authorization: Bearer <jwt_token>
```

#### Unsubscribe from Wallet Updates
```http
POST /api/wallet/:address/unsubscribe
Authorization: Bearer <jwt_token>
```

### Real-time Updates

#### Server-Sent Events (SSE)
```http
GET /api/wallet/:address/events
Authorization: Bearer <jwt_token>
```

**Event Format:**
```json
{
  "wallet": "7Ta9Z4...Nau1FQ",
  "updatedAt": "2024-01-01T00:00:00Z",
  "reason": "external_tx",
  "totals": {
    "totalSolValue": 1.5,
    "totalUsdValue": 150.0
  },
  "transactionHash": "abc123...",
  "metadata": {
    "amount": 0.5,
    "tokenSymbol": "SOL",
    "valueUsd": 50.0
  }
}
```

#### WebSocket Status
```http
GET /api/wallet/websocket/status
Authorization: Bearer <jwt_token>
```

## 🎯 Frontend Integration

### React Hook for Real-time Balance Updates

```typescript
// hooks/useWalletBalance.ts
import { useState, useEffect } from 'react';

export function useWalletBalance(walletAddress: string) {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    // Initial fetch
    fetchBalance();
    
    // SSE connection for real-time updates
    const eventSource = new EventSource(`/api/wallet/${walletAddress}/events`, {
      headers: {
        'Authorization': `Bearer ${getAuthToken()}`
      }
    });
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.reason === 'external_tx' || data.reason === 'cache_update') {
        // Refresh balance when external transaction detected
        fetchBalance();
      }
    };
    
    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
    
    return () => {
      eventSource.close();
    };
  }, [walletAddress]);
  
  const fetchBalance = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/wallet/${walletAddress}/balance`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`
        }
      });
      const data = await response.json();
      
      if (data.success) {
        setBalance(data.data);
        setError(null);
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to fetch balance');
    } finally {
      setLoading(false);
    }
  };
  
  return { balance, loading, error, refetch: fetchBalance };
}
```

### React Component Example

```typescript
// components/WalletBalance.tsx
import React from 'react';
import { useWalletBalance } from '../hooks/useWalletBalance';

export const WalletBalance: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const { balance, loading, error, refetch } = useWalletBalance(walletAddress);
  
  if (loading) return <div>Loading balance...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!balance) return <div>No balance data</div>;
  
  return (
    <div className="wallet-balance">
      <h3>Wallet Balance</h3>
      <div className="totals">
        <div>SOL: {balance.totalSolValue.toFixed(4)}</div>
        <div>USD: ${balance.totalUsdValue.toFixed(2)}</div>
      </div>
      
      <div className="tokens">
        <h4>Tokens</h4>
        {balance.tokens.map(token => (
          <div key={token.mint} className="token">
            <span>{token.symbol}: {token.uiAmount.toFixed(4)}</span>
            <span>${token.usdEquivalent.toFixed(2)}</span>
          </div>
        ))}
      </div>
      
      <button onClick={refetch}>Refresh Balance</button>
    </div>
  );
};
```

## 🔄 How It Works

### 1. External Deposit Detection
1. **Solana WebSocket Connection** - Connects to Helius Solana WebSocket API
2. **Account Notifications** - Receives real-time Solana account change notifications
3. **Transaction Analysis** - Analyzes Solana transactions to identify external deposits
4. **Platform Wallet Filtering** - Filters out internal platform transactions

### 2. Balance Update Process
1. **Transaction Detection** - External transaction detected via WebSocket
2. **Balance Refresh** - Triggers immediate balance refresh from Helius
3. **Cache Update** - Updates cached balance data
4. **SSE Notification** - Sends real-time update to frontend
5. **UI Update** - Frontend receives and displays updated balance

### 3. Performance Optimizations
- **Debouncing** - 800ms debounce for normal refreshes, 100ms for immediate
- **Caching** - 5-minute cache validity for balance data
- **Parallel Processing** - Controlled concurrency (6 concurrent requests)
- **Background Updates** - Periodic refresh every 30 seconds

## 📊 Monitoring & Logging

### Key Metrics to Track
1. **External Transaction Detection Time** - Time from blockchain confirmation to detection
2. **Balance Update Latency** - Time from detection to UI update
3. **Cache Hit Rate** - Percentage of requests served from cache
4. **API Error Rate** - Failed requests to Helius
5. **SSE Connection Health** - Active SSE connections and drops

### Logging Examples
```typescript
// External transaction detection
logger.info('[EXTERNAL_TX] Found new external transaction', {
  signature: tx.signature,
  wallet: walletAddress,
  amount: tx.amount,
  tokenSymbol: tx.tokenSymbol,
  detectionTimeMs: Date.now() - notificationReceivedTimestamp
});

// Balance update performance
logger.info('[REFRESH] Balance update completed', {
  wallet: walletAddress,
  totalSolValue: portfolio.totalSolValue,
  totalUsdValue: portfolio.totalUsdValue,
  updateTimeMs: Date.now() - startTime
});
```

## 🚀 Deployment Checklist

### Pre-deployment
- [ ] Database schema executed in Supabase
- [ ] Environment variables configured in Doppler
- [ ] Helius API key obtained and tested
- [ ] All dependencies installed
- [ ] Services tested locally

### Deployment Steps
1. **Deploy Backend** - Push code to production
2. **Verify Services** - Check service initialization logs
3. **Test WebSocket** - Verify WebSocket connection to Helius
4. **Test API Endpoints** - Verify all endpoints work correctly
5. **Monitor Performance** - Watch logs for errors and performance

### Post-deployment
- [ ] Monitor external transaction detection
- [ ] Verify balance updates work correctly
- [ ] Check SSE connections from frontend
- [ ] Monitor background service performance
- [ ] Set up alerts for critical errors

## 🔧 Troubleshooting

### Common Issues

#### External transactions not detected
- Check WebSocket connection status
- Verify platform wallet list is loaded
- Check Helius API limits and quota

#### Balance updates delayed
- Check cache expiration settings
- Verify background service is running
- Check database connection pool

#### SSE events not received
- Verify CORS configuration
- Check browser SSE support
- Monitor connection drops

#### High API usage
- Review debouncing settings
- Check for duplicate refresh calls
- Optimize cache hit rates

### Debug Commands

```bash
# Check WebSocket status
curl -H "Authorization: Bearer <token>" \
  https://your-api.com/api/wallet/websocket/status

# Force refresh a wallet
curl -X POST -H "Authorization: Bearer <token>" \
  https://your-api.com/api/wallet/7Ta9Z4...Nau1FQ/refresh

# Get cache statistics
curl -H "Authorization: Bearer <token>" \
  https://your-api.com/api/wallet/cache/stats
```

## 🎉 Benefits

### For Users
- **Instant Notifications** - Real-time updates when deposits arrive
- **Accurate Balances** - Always up-to-date balance information
- **Seamless Experience** - No manual refresh needed
- **Transaction History** - Complete history of external deposits

### For Platform
- **Reduced Support** - Fewer "where's my deposit" inquiries
- **Better UX** - Improved user satisfaction
- **Scalable Architecture** - Handles high transaction volumes
- **Cost Effective** - Optimized API usage with caching

## 📈 Future Enhancements

### Potential Improvements
1. **Multi-chain Support** - Extend to other blockchains
2. **Advanced Analytics** - Transaction pattern analysis
3. **Smart Notifications** - Customizable notification preferences
4. **Batch Processing** - Optimize for high-volume scenarios
5. **Machine Learning** - Predict transaction patterns

---

**🎯 This implementation provides a robust, scalable system for handling external wallet deposits with real-time balance updates and excellent user experience!**
