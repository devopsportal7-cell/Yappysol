# Real-Time Balance Updates - Frontend Implementation Guide

## 🎯 **Objective**
Implement real-time portfolio balance updates using WebSocket connection. When the backend receives a new transaction and updates the database, the frontend should receive immediate updates and reflect the changes in the UI.

---

## 🔌 **WebSocket Connection Setup**

### **Environment Variables**
Add to your `.env` file:
```env
REACT_APP_WS_URL=ws://localhost:8080/ws
# In production: wss://your-backend-domain.com:8080/ws
```

### **Connection Details**
- **URL:** `ws://localhost:8080/ws` (development)
- **URL:** `wss://your-backend-domain.com:8080/ws` (production)
- **Protocol:** WebSocket
- **Authentication:** Not required (public endpoint)

---

## 🎣 **React Hook: `usePortfolioWebSocket`**

Create `src/hooks/usePortfolioWebSocket.ts`:

```typescript
import { useEffect, useRef, useState, useCallback } from 'react';

interface PortfolioData {
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

interface WebSocketMessage {
  type: 'portfolio_update' | 'balance_update' | 'connection' | 'pong';
  walletAddress?: string;
  data?: any;
  timestamp?: string;
}

export function usePortfolioWebSocket(walletAddress: string) {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = 1000;
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = useCallback(() => {
    if (!walletAddress) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
    
    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log('✅ Connected to portfolio WebSocket');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Subscribe to wallet updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe_wallet',
          walletAddress
        }));

        // Start heartbeat
        heartbeatIntervalRef.current = setInterval(() => {
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Every 30 seconds
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('❌ Invalid WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        setIsConnected(false);
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
        }
        scheduleReconnect();
      };

      wsRef.current.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
      };

    } catch (error) {
      console.error('❌ Error creating WebSocket connection:', error);
      scheduleReconnect();
    }
  }, [walletAddress]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'portfolio_update':
        console.log('📊 Portfolio update received:', message);
        if (message.data) {
          setPortfolio(message.data);
        }
        break;
      
      case 'balance_update':
        console.log('💰 Balance update received:', message);
        // Trigger portfolio refresh
        if (message.data) {
          setPortfolio(message.data);
        }
        break;
      
      case 'connection':
        console.log('✅ WebSocket connected:', message);
        break;
      
      case 'pong':
        console.log('🏓 Heartbeat received');
        break;
      
      default:
        console.log('❓ Unknown message type:', message.type);
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached');
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = reconnectDelay * Math.pow(2, reconnectAttemptsRef.current - 1);
    
    console.log(`🔄 Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
    
    setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  const disconnect = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [walletAddress]); // Reconnect when wallet address changes

  return {
    portfolio,
    isConnected,
    reconnect: connect
  };
}
```

---

## 📱 **Usage in Components**

### **Update Your Portfolio Component:**

```typescript
import React from 'react';
import { usePortfolioWebSocket } from '../hooks/usePortfolioWebSocket';

interface PortfolioProps {
  walletAddress: string;
}

export const Portfolio: React.FC<PortfolioProps> = ({ walletAddress }) => {
  const { portfolio, isConnected } = usePortfolioWebSocket(walletAddress);

  return (
    <div className="portfolio">
      {/* Connection Status Indicator */}
      <div className="connection-status" style={{ 
        padding: '8px 12px',
        borderRadius: '6px',
        marginBottom: '16px',
        backgroundColor: isConnected ? '#10b981' : '#ef4444',
        color: 'white',
        fontSize: '14px',
        display: 'inline-block'
      }}>
        {isConnected ? '🟢 Live Updates Active' : '🔴 Disconnected'}
      </div>

      {portfolio ? (
        <>
          {/* Total Value */}
          <div className="total-value" style={{
            fontSize: '32px',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: '#1f2937'
          }}>
            ${portfolio.totalUsdValue.toFixed(2)} USD
          </div>

          {/* Token List */}
          <div className="tokens">
            <h3 style={{ marginBottom: '16px', fontSize: '18px' }}>Tokens</h3>
            {portfolio.tokens.map((token) => (
              <div
                key={token.mint}
                className="token-item"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: '#f9fafb',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb'
                }}
              >
                {token.image && (
                  <img
                    src={token.image}
                    alt={token.symbol}
                    style={{
                      width: '32px',
                      height: '32px',
                      marginRight: '12px',
                      borderRadius: '50%'
                    }}
                  />
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                    {token.symbol}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {token.name || token.mint}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: '600', color: '#1f2937' }}>
                    {token.uiAmount.toFixed(6)}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    ${token.usdEquivalent.toFixed(2)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{
          padding: '40px',
          textAlign: 'center',
          color: '#6b7280'
        }}>
          Loading portfolio...
        </div>
      )}
    </div>
  );
};
```

---

## 🎨 **Additional CSS (Optional)**

Add to your CSS file for better styling:

```css
.portfolio {
  max-width: 800px;
  margin: 0 auto;
  padding: 24px;
}

.connection-status {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.token-item {
  transition: all 0.2s ease;
}

.token-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}
```

---

## 🔄 **How It Works**

1. **Initial Connection:** When the component mounts, it connects to the WebSocket server
2. **Subscribe:** Automatically subscribes to updates for the specified wallet address
3. **Real-time Updates:** When backend detects a new transaction:
   - WebSocket emits `portfolio_update` or `balance_update` message
   - Frontend receives the message and updates state
   - UI automatically reflects the new balance
4. **Heartbeat:** Sends ping every 30 seconds to keep connection alive
5. **Auto-reconnect:** Automatically reconnects if connection is lost

---

## ✅ **Testing**

1. **Connect to WebSocket:**
   - Open browser DevTools → Network → WS tab
   - You should see a WebSocket connection to `ws://localhost:8080/ws`

2. **Trigger an Update:**
   - Send SOL or any token to the connected wallet
   - Within seconds, the UI should update automatically

3. **Verify Updates:**
   - Check console logs for "Portfolio update received"
   - UI should reflect the new balance immediately

---

## 🚨 **Error Handling**

The implementation includes:
- ✅ Automatic reconnection with exponential backoff
- ✅ Maximum reconnection attempts (5)
- ✅ Connection status indicator
- ✅ Graceful error handling
- ✅ WebSocket cleanup on unmount

---

## 📝 **Summary**

This implementation provides:
- ✅ Real-time portfolio updates via WebSocket
- ✅ Automatic UI refresh on transaction detection
- ✅ Connection status indicator
- ✅ Robust error handling and reconnection
- ✅ Clean, reusable React hook
- ✅ Zero polling overhead

The frontend will now receive immediate updates whenever the backend processes a new transaction! 🚀
