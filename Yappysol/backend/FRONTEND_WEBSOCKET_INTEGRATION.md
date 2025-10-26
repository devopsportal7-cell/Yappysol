# Frontend WebSocket Integration Guide

## 🚀 **Real-Time Portfolio Updates**

The backend now provides a WebSocket server for real-time portfolio updates. This eliminates the need for polling and provides instant updates when wallet balances change.

## 🔌 **WebSocket Connection**

### **Connection Details:**
- **URL:** `ws://localhost:8080/ws` (development)
- **URL:** `wss://your-backend-domain.com:8080/ws` (production)
- **Protocol:** WebSocket
- **Authentication:** Not required (public endpoint)

### **Frontend Implementation:**

```typescript
// WebSocket client for real-time updates
class PortfolioWebSocketClient {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  constructor(private onPortfolioUpdate: (data: any) => void) {}

  connect(): void {
    const wsUrl = process.env.NODE_ENV === 'production' 
      ? 'wss://your-backend-domain.com:8080/ws'
      : 'ws://localhost:8080/ws';

    this.ws = new WebSocket(wsUrl);

    this.ws.onopen = () => {
      console.log('✅ Connected to portfolio WebSocket');
      this.reconnectAttempts = 0;
      
      // Send heartbeat
      this.sendHeartbeat();
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('❌ Invalid WebSocket message:', error);
      }
    };

    this.ws.onclose = () => {
      console.log('🔌 WebSocket connection closed');
      this.scheduleReconnect();
    };

    this.ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
    };
  }

  private handleMessage(message: any): void {
    switch (message.type) {
      case 'portfolio_update':
        console.log('📊 Portfolio update received:', message);
        this.onPortfolioUpdate(message.data);
        break;
      
      case 'balance_update':
        console.log('💰 Balance update received:', message);
        // Handle balance update
        break;
      
      case 'transaction_update':
        console.log('🔄 Transaction update received:', message);
        // Handle transaction update
        break;
      
      case 'connection':
        console.log('✅ WebSocket connected:', message.message);
        break;
      
      case 'pong':
        console.log('🏓 Heartbeat received');
        break;
      
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }

  // Subscribe to wallet updates
  subscribeToWallet(walletAddress: string): void {
    this.send({
      type: 'subscribe_wallet',
      walletAddress
    });
  }

  // Unsubscribe from wallet updates
  unsubscribeFromWallet(walletAddress: string): void {
    this.send({
      type: 'unsubscribe_wallet',
      walletAddress
    });
  }

  // Send heartbeat
  private sendHeartbeat(): void {
    setInterval(() => {
      this.send({ type: 'ping' });
    }, 30000); // Every 30 seconds
  }

  private send(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}
```

## 🎯 **React Integration Example:**

```typescript
// React hook for portfolio WebSocket
import { useEffect, useRef, useState } from 'react';

export function usePortfolioWebSocket(walletAddress: string) {
  const [portfolio, setPortfolio] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsClientRef = useRef<PortfolioWebSocketClient | null>(null);

  useEffect(() => {
    if (!walletAddress) return;

    // Create WebSocket client
    wsClientRef.current = new PortfolioWebSocketClient((data) => {
      setPortfolio(data);
    });

    // Connect and subscribe
    wsClientRef.current.connect();
    
    // Subscribe to wallet updates
    setTimeout(() => {
      wsClientRef.current?.subscribeToWallet(walletAddress);
    }, 1000);

    return () => {
      wsClientRef.current?.disconnect();
    };
  }, [walletAddress]);

  return {
    portfolio,
    isConnected,
    subscribeToWallet: (address: string) => wsClientRef.current?.subscribeToWallet(address),
    unsubscribeFromWallet: (address: string) => wsClientRef.current?.unsubscribeFromWallet(address)
  };
}
```

## 📱 **Usage in Components:**

```typescript
// Portfolio component with real-time updates
function PortfolioComponent({ walletAddress }: { walletAddress: string }) {
  const { portfolio, isConnected } = usePortfolioWebSocket(walletAddress);

  return (
    <div>
      <div className="connection-status">
        {isConnected ? '🟢 Connected' : '🔴 Disconnected'}
      </div>
      
      {portfolio ? (
        <div className="portfolio">
          <h3>Portfolio (Real-time)</h3>
          <div className="total-value">
            Total: ${portfolio.totalUsdValue.toFixed(2)} USD
          </div>
          <div className="tokens">
            {portfolio.tokens.map(token => (
              <div key={token.mint} className="token">
                <img src={token.image} alt={token.symbol} />
                <span>{token.symbol}: {token.uiAmount}</span>
                <span>${token.usdEquivalent.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>Loading portfolio...</div>
      )}
    </div>
  );
}
```

## 🔄 **Message Types:**

### **From Backend to Frontend:**

```typescript
// Portfolio update (complete portfolio data)
{
  type: 'portfolio_update',
  walletAddress: '9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd',
  data: {
    totalSolValue: 1.5,
    totalUsdValue: 300.00,
    tokens: [
      {
        mint: 'So11111111111111111111111111111111111111112',
        symbol: 'SOL',
        uiAmount: 1.5,
        priceUsd: 200.00,
        usdEquivalent: 300.00,
        image: 'https://...',
        solscanUrl: 'https://solscan.io/token/...'
      }
    ]
  },
  timestamp: '2025-10-25T22:30:00.000Z'
}

// Balance update (account change detected)
{
  type: 'balance_update',
  walletAddress: '9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd',
  data: {
    reason: 'account_change',
    slot: 123456789,
    lamports: 1500000000
  },
  timestamp: '2025-10-25T22:30:00.000Z'
}

// Transaction update (new transaction detected)
{
  type: 'transaction_update',
  walletAddress: '9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd',
  data: {
    signature: '5J7X8...',
    type: 'transfer',
    amount: 0.5,
    token: 'SOL'
  },
  timestamp: '2025-10-25T22:30:00.000Z'
}
```

### **From Frontend to Backend:**

```typescript
// Subscribe to wallet updates
{
  type: 'subscribe_wallet',
  walletAddress: '9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd'
}

// Unsubscribe from wallet updates
{
  type: 'unsubscribe_wallet',
  walletAddress: '9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd'
}

// Heartbeat
{
  type: 'ping'
}
```

## 🎯 **Benefits:**

✅ **Real-time updates** - No more polling needed  
✅ **Instant UI updates** - Portfolio changes appear immediately  
✅ **Reduced API calls** - Only updates when needed  
✅ **Better UX** - Users see changes as they happen  
✅ **Efficient** - Only subscribed wallets get updates  

## 🔧 **Environment Variables:**

```bash
# Backend
FRONTEND_WS_PORT=8080  # WebSocket server port

# Frontend
REACT_APP_WS_URL=ws://localhost:8080/ws  # Development
REACT_APP_WS_URL=wss://your-backend.com:8080/ws  # Production
```

This WebSocket integration provides true real-time portfolio updates! 🚀
