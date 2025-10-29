# 🔄 Fix: Real-Time Balance Updates via WebSocket

## Problem

When external transactions are detected:
- ✅ **Activity log updates immediately**
- ❌ **Balance does NOT update automatically** - requires manual page refresh

## Root Cause

The `useTotalPortfolioBalances` hook only fetches balance:
- ✅ **Once on mount** (initial load from database)
- ❌ **NOT listening to WebSocket** events when balance changes

## Solution

**Use WebSocket for real-time push updates** instead of polling:
1. **Initial load:** Get balance from database (on login/refresh) ✅ Already working
2. **Real-time updates:** Listen to WebSocket events and refetch when account changes ✅ Need to add

## Backend Status ✅

The backend is already set up:
- **WebSocket URL:** `wss://yappysol.onrender.com/ws`
- **Subscription:** Send `{ type: 'subscribe_wallet', walletAddress: '...' }`
- **Event Types:** `balance_update` or `portfolio_update`
- **When Emitted:** After transactions are detected and balance cache is refreshed

## Implementation

### File to Edit

**File:** `frontend/src/pages/Chat.tsx`

**Location:** Inside the `useTotalPortfolioBalances` function (around line 251)

### Step 1: Update the Hook

**Find this function:**

```typescript
function useTotalPortfolioBalances(publicKey: string | undefined) {
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    // ... existing code that fetches from /api/portfolio/:address ...
  }, [publicKey]);

  useEffect(() => {
    fetchPortfolio(); // ✅ Only runs once on mount
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}
```

### Step 2: Add WebSocket Listener

**Add this new `useEffect` AFTER the existing one (after line 290):**

```typescript
// Listen to WebSocket for real-time balance updates
useEffect(() => {
  if (!publicKey) return;

  // Determine WebSocket URL
  const wsUrl = process.env.REACT_APP_WS_URL || 'wss://yappysol.onrender.com/ws';
  
  console.log('[BALANCE] Connecting to WebSocket:', wsUrl);
  
  const ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log('[BALANCE] WebSocket connected');
    
    // Subscribe to wallet updates for this wallet
    ws.send(JSON.stringify({
      type: 'subscribe_wallet',
      walletAddress: publicKey
    }));
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      console.log('[BALANCE] WebSocket message received:', message);

      // Listen for balance/portfolio update events for our wallet
      if (
        (message.type === 'balance_update' || message.type === 'portfolio_update') &&
        message.walletAddress === publicKey
      ) {
        console.log('[BALANCE] Balance update event received, refetching from database...');
        // Refetch balance from database endpoint (not from WebSocket data)
        fetchPortfolio();
      }
      
      // Handle subscription confirmation
      if (message.type === 'subscription_confirmed' && message.walletAddress === publicKey) {
        console.log('[BALANCE] Successfully subscribed to wallet updates');
      }
      
      // Handle pong (heartbeat response)
      if (message.type === 'pong') {
        console.log('[BALANCE] Heartbeat received');
      }
    } catch (error) {
      console.error('[BALANCE] Error parsing WebSocket message:', error);
    }
  };

  ws.onerror = (error) => {
    console.error('[BALANCE] WebSocket error:', error);
  };

  ws.onclose = () => {
    console.log('[BALANCE] WebSocket connection closed');
    // Note: WebSocket will auto-reconnect in some browsers, but you might want to add manual reconnect logic
  };

  // Cleanup: close connection and unsubscribe on unmount
  return () => {
    console.log('[BALANCE] Closing WebSocket connection');
    
    // Unsubscribe before closing
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribe_wallet',
        walletAddress: publicKey
      }));
    }
    
    ws.close();
  };
}, [publicKey, fetchPortfolio]);
```

### Step 3: Optional - Add Reconnection Logic

If you want automatic reconnection on disconnect:

```typescript
// Listen to WebSocket for real-time balance updates (with auto-reconnect)
useEffect(() => {
  if (!publicKey) return;

  const wsUrl = process.env.REACT_APP_WS_URL || 'wss://yappysol.onrender.com/ws';
  let ws: WebSocket | null = null;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let reconnectAttempts = 0;
  const maxReconnectAttempts = 5;
  const reconnectDelay = 3000; // 3 seconds

  const connect = () => {
    console.log('[BALANCE] Connecting to WebSocket:', wsUrl);
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('[BALANCE] WebSocket connected');
      reconnectAttempts = 0; // Reset on successful connection
      
      // Subscribe to wallet updates
      ws.send(JSON.stringify({
        type: 'subscribe_wallet',
        walletAddress: publicKey
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log('[BALANCE] WebSocket message:', message.type);

        if (
          (message.type === 'balance_update' || message.type === 'portfolio_update') &&
          message.walletAddress === publicKey
        ) {
          console.log('[BALANCE] Balance update event received, refetching...');
          fetchPortfolio();
        }
      } catch (error) {
        console.error('[BALANCE] Error parsing message:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[BALANCE] WebSocket error:', error);
    };

    ws.onclose = () => {
      console.log('[BALANCE] WebSocket closed');
      ws = null;
      
      // Auto-reconnect with exponential backoff
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        const delay = reconnectDelay * Math.pow(2, reconnectAttempts - 1); // Exponential backoff
        console.log(`[BALANCE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
        
        reconnectTimeout = setTimeout(() => {
          connect();
        }, delay);
      } else {
        console.error('[BALANCE] Max reconnect attempts reached');
      }
    };
  };

  // Initial connection
  connect();

  // Cleanup
  return () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'unsubscribe_wallet',
        walletAddress: publicKey
      }));
      ws.close();
    }
  };
}, [publicKey, fetchPortfolio]);
```

## Complete Updated Function

After adding the WebSocket listener, your function should look like:

```typescript
function useTotalPortfolioBalances(publicKey: string | undefined) {
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      // Fetch from database endpoint (initial load or on update event)
      const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
      const tokens = await res.json();
      // ... existing calculation code ...
      setTotalUsd(usd);
      setTotalSol(sol);
    } catch (e) {
      setTotalUsd(0);
      setTotalSol(0);
    }
    setLoading(false);
  }, [publicKey]);

  // Initial fetch from database (on login/refresh)
  useEffect(() => {
    fetchPortfolio();
  }, [publicKey, fetchPortfolio]);

  // Listen to WebSocket for real-time updates
  useEffect(() => {
    if (!publicKey) return;

    const wsUrl = process.env.REACT_APP_WS_URL || 'wss://yappysol.onrender.com/ws';
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        type: 'subscribe_wallet',
        walletAddress: publicKey
      }));
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (
          (message.type === 'balance_update' || message.type === 'portfolio_update') &&
          message.walletAddress === publicKey
        ) {
          fetchPortfolio(); // Refetch from database
        }
      } catch (error) {
        console.error('[BALANCE] WebSocket error:', error);
      }
    };

    ws.onerror = (error) => {
      console.error('[BALANCE] WebSocket error:', error);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'unsubscribe_wallet',
          walletAddress: publicKey
        }));
      }
      ws.close();
    };
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}
```

## How It Works

1. **On Login/Refresh:**
   - `fetchPortfolio()` is called → Gets balance from database ✅

2. **When Transaction Detected:**
   - Backend detects transaction → Updates database → Emits WebSocket event
   - Frontend receives `balance_update` event → Calls `fetchPortfolio()` → Gets fresh data from database ✅

## Endpoints Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| WebSocket | `wss://` | `wss://yappysol.onrender.com/ws` - Real-time events |
| Portfolio | `GET` | `https://yappysol.onrender.com/api/portfolio/:address` - Fetch balance from database |

## WebSocket Message Format

**Subscribe:**
```json
{
  "type": "subscribe_wallet",
  "walletAddress": "9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd"
}
```

**Update Event (from backend):**
```json
{
  "type": "balance_update",
  "walletAddress": "9noCWpAZXY1pWmEMXTAKdnek7BmgyagcFEwApnyE1Dpd",
  "data": { /* balance data */ },
  "timestamp": "2025-10-29T22:30:00Z"
}
```

## Testing

1. Open app and verify WebSocket connects (check browser console)
2. Send SOL from external wallet to your app wallet
3. Verify:
   - Activity log shows transaction immediately ✅
   - Balance updates automatically within 1-2 seconds ✅
   - No manual refresh needed ✅

## Environment Variable (Optional)

If you want to override the WebSocket URL, add to `.env`:
```
REACT_APP_WS_URL=wss://yappysol.onrender.com/ws
```

## Troubleshooting

1. **WebSocket not connecting?** 
   - Check browser console for errors
   - Verify WebSocket URL is correct
   - Check if backend WebSocket server is running

2. **Events not received?**
   - Verify subscription message was sent (check console)
   - Check that `walletAddress` matches exactly
   - Verify backend is emitting events (check backend logs)

3. **Balance not updating?**
   - Check if `fetchPortfolio()` is being called (console log)
   - Verify `/api/portfolio/:address` endpoint is working
   - Check browser network tab for portfolio fetch
