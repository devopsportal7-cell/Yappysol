# Balance Not Updating After External Transactions

## Issue Summary

✅ **Activity log updates immediately** when external wallet sends funds  
❌ **Balance never updates** automatically on frontend  
❌ **Manual refresh required** to see new balance

## Root Cause Analysis

### What's Working ✅
1. **Helius Webhook** detects the transaction
2. **Transaction stored** in `external_transactions` table
3. **Backend calls `requestWalletRefresh()`** to update balance cache
4. **Balance cache updated** in database (`wallet_balance_cache`)
5. **WebSocket/SSE events emitted** to notify frontend

### What's NOT Working ❌
**Frontend does NOT listen to WebSocket/SSE events for balance updates!**

Looking at `Chat.tsx` lines 251-293:
```typescript
function useTotalPortfolioBalances(publicKey: string | undefined) {
  const fetchPortfolio = useCallback(async () => {
    // Fetches from /api/portfolio/:address
    const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
    // ... calculates totals
  }, [publicKey]);

  useEffect(() => {
    fetchPortfolio(); // ✅ Called ONCE on mount
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}
```

**Problem**: The hook only fetches on mount. It does NOT listen to:
- WebSocket events from backend
- SSE events from backend
- Any real-time updates

## Backend Flow (Working ✅)

When external transaction detected:

1. **Webhook receives transaction** (`webhooks.ts`)
2. **Processes and stores** transaction
3. **Calls `requestWalletRefresh(walletAddress, true)`** (line 234, 316)
4. **Waits 3 seconds** for Helius to propagate
5. **Fetches fresh portfolio** from Helius (line 50)
6. **Updates cache** in database (line 53)
7. **Emits WebSocket event** to notify frontend (line 89)
8. **Emits SSE event** for frontend (line 93-96)

But frontend doesn't listen! ❌

## Solution

Add WebSocket/SSE listener to frontend to automatically refetch balance when backend sends update event.

### Option 1: Add EventSource Listener (SSE)

```typescript
// In Chat.tsx or a custom hook
useEffect(() => {
  if (!publicKey) return;

  const eventSource = new EventSource(`${apiUrl}/api/events/wallet-updated`);
  
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    // Check if this update is for our wallet
    if (data.wallet === publicKey) {
      console.log('[BALANCE] SSE event received, refetching balance');
      fetchPortfolio(); // Refetch balance
    }
  };

  eventSource.onerror = (error) => {
    console.error('[BALANCE] SSE error:', error);
    eventSource.close();
  };

  return () => {
    eventSource.close();
  };
}, [publicKey, fetchPortfolio]);
```

### Option 2: Add WebSocket Listener

```typescript
// In Chat.tsx or a custom hook
useEffect(() => {
  if (!publicKey) return;

  const ws = new WebSocket('wss://yappysol.onrender.com');
  
  ws.onopen = () => {
    console.log('[BALANCE] WebSocket connected');
    // Join room for this wallet
    ws.send(JSON.stringify({ type: 'subscribe', wallet: publicKey }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'wallet_updated' && data.wallet === publicKey) {
      console.log('[BALANCE] WebSocket event received, refetching balance');
      fetchPortfolio(); // Refetch balance
    }
  };

  ws.onerror = (error) => {
    console.error('[BALANCE] WebSocket error:', error);
  };

  return () => {
    ws.close();
  };
}, [publicKey, fetchPortfolio]);
```

### Option 3: Polling Fallback (Simplest)

If WebSocket/SSE setup is complex, add polling:

```typescript
useEffect(() => {
  if (!publicKey) return;

  // Poll every 10 seconds for balance updates
  const interval = setInterval(() => {
    fetchPortfolio();
  }, 10000);

  return () => clearInterval(interval);
}, [publicKey, fetchPortfolio]);
```

## Recommended Fix

I recommend **Option 1 (SSE)** because:
1. Already implemented in backend (`emitWalletUpdated`)
2. Simple to add to frontend
3. Low overhead
4. Works with existing infrastructure

## Implementation Steps

1. Add SSE endpoint in backend (if not exists)
2. Add `useEffect` hook in `Chat.tsx` or create `useBalanceWebSocket` hook
3. Listen for `wallet_updated` events
4. Call `fetchPortfolio()` when event received
5. Test with external transfer

## Current Status

- ✅ Backend: Balance update flow working
- ✅ Backend: WebSocket events emitted
- ✅ Backend: SSE events emitted  
- ❌ Frontend: Not listening to real-time updates
- ❌ Frontend: Manual refresh required

## Quick Fix

If you want immediate fix without implementing listeners, you can:

1. Add a "Refresh Balance" button on the frontend
2. Increase polling interval to every 5 seconds
3. Add manual refresh when user comes back to tab

But the proper solution is to add WebSocket/SSE listener.

