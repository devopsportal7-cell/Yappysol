# Prompt for Lovable: Fix Real-Time Balance Updates

## Problem Statement

When external transactions (deposits from other wallets) are detected by the backend:
- ✅ Activity log updates immediately on frontend
- ❌ Balance does NOT update automatically
- ❌ User must manually refresh to see new balance

The backend IS working correctly - it emits WebSocket/SSE events when balance changes. The frontend is NOT listening to these events.

## Root Cause

The `useTotalPortfolioBalances` hook in `Chat.tsx` only fetches balance once when the component mounts. It does NOT subscribe to real-time updates from the backend.

**Current code** (lines 251-293 in `Chat.tsx`):
```typescript
function useTotalPortfolioBalances(publicKey: string | undefined) {
  const fetchPortfolio = useCallback(async () => {
    if (!publicKey) return;
    const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
    // ... calculates totals
  }, [publicKey]);

  useEffect(() => {
    fetchPortfolio(); // Only called once on mount
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}
```

## Solution: Add EventSource Listener for Real-Time Updates

### What to Implement

Add an SSE (Server-Sent Events) listener to automatically refetch the balance when the backend emits a `wallet_updated` event.

### Implementation Steps

1. **File**: `Yappysol/frontend/src/pages/Chat.tsx`
2. **Location**: Inside the `useTotalPortfolioBalances` function
3. **Add**: A new `useEffect` hook that subscribes to SSE events

### Code to Add

Replace the current `useTotalPortfolioBalances` function with this enhanced version:

```typescript
function useTotalPortfolioBalances(publicKey: string | undefined) {
  const [totalUsd, setTotalUsd] = useState(0);
  const [totalSol, setTotalSol] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchPortfolio = useCallback(async () => {
    if (!publicKey) return;
    setLoading(true);
    try {
      const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`);
      const tokens = await res.json();
      let usd = 0;
      let sol = 0;
      let solPriceUsd = 0;
      for (const t of tokens) {
        if (t.symbol === 'SOL' && t.price) {
          solPriceUsd = Number(t.price);
          break;
        }
      }
      for (const t of tokens) {
        usd += Number(t.balanceUsd) || 0;
        if (t.symbol === 'SOL') {
          sol += Number(t.balance) || 0;
        } else if (t.price && solPriceUsd) {
          sol += (Number(t.balanceUsd) || 0) / solPriceUsd;
        }
      }
      setTotalUsd(usd);
      setTotalSol(sol);
    } catch (e) {
      setTotalUsd(0);
      setTotalSol(0);
    }
    setLoading(false);
  }, [publicKey]);

  // Initial fetch on mount
  useEffect(() => {
    fetchPortfolio();
  }, [publicKey, fetchPortfolio]);

  // Add SSE listener for real-time balance updates
  useEffect(() => {
    if (!publicKey) return;

    console.log('[BALANCE] Setting up SSE listener for wallet:', publicKey);
    
    // Use EventSource to listen to backend balance update events
    const apiUrl = process.env.REACT_APP_API_URL || 'https://yappysol.onrender.com';
    const eventSource = new EventSource(`${apiUrl}/api/events/wallet-updated`);
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[BALANCE] SSE event received:', data);
        
        // Check if this update is for our wallet
        if (data.wallet === publicKey) {
          console.log('[BALANCE] Balance update event for our wallet, refetching...');
          fetchPortfolio();
        }
      } catch (error) {
        console.error('[BALANCE] Error parsing SSE event:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error('[BALANCE] SSE connection error:', error);
      // SSE will automatically reconnect
    };

    eventSource.onopen = () => {
      console.log('[BALANCE] SSE connection opened');
    };

    // Cleanup on unmount
    return () => {
      console.log('[BALANCE] Closing SSE connection');
      eventSource.close();
    };
  }, [publicKey, fetchPortfolio]);

  return { totalUsd, totalSol, loading, fetchPortfolio };
}
```

## Alternative: WebSocket Implementation (If SSE doesn't work)

If the SSE endpoint doesn't exist or doesn't work, you can use WebSocket instead:

```typescript
// Add this useEffect inside useTotalPortfolioBalances function
useEffect(() => {
  if (!publicKey) return;

  const apiUrl = process.env.REACT_APP_API_URL || 'https://yappysol.onrender.com';
  const ws = new WebSocket(`${apiUrl.replace('http', 'ws')}/ws`);
  
  ws.onopen = () => {
    console.log('[BALANCE] WebSocket connected');
    // Subscribe to balance updates for this wallet
    ws.send(JSON.stringify({ 
      type: 'subscribe', 
      event: 'wallet_updated',
      wallet: publicKey 
    }));
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    if (data.type === 'wallet_updated' && data.wallet === publicKey) {
      console.log('[BALANCE] WebSocket balance update received, refetching...');
      fetchPortfolio();
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

## Testing Instructions

After implementing the fix:

1. **Start the application**
2. **Send funds from external wallet** to the user's wallet
3. **Observe**: Balance should update automatically within 3-5 seconds without manual refresh
4. **Check console**: Should see `[BALANCE] SSE event received` or similar logs
5. **Verify**: Activity log shows transaction AND balance updates together

## Expected Behavior After Fix

- ✅ External transaction detected by backend
- ✅ Transaction stored in database
- ✅ Backend emits SSE/WebSocket event
- ✅ Frontend receives event via EventSource/WebSocket
- ✅ Frontend automatically refetches balance
- ✅ User sees new balance WITHOUT manual refresh

## Important Notes

1. **Do NOT remove** the existing `fetchPortfolio` call - we still need initial fetch
2. **Keep both** `useEffect` hooks - one for initial fetch, one for real-time updates
3. **Add console logs** to debug if events are being received
4. **Handle errors gracefully** - if SSE/WebSocket fails, balance should still show (just won't auto-update)

## Backend Integration

The backend is already configured to emit these events. You can verify this is working by checking backend logs for:
- `[REFRESH] Wallet refresh completed`
- `[EVENTS] Emitting wallet_updated event`

If you see these logs but frontend doesn't update, the issue is the missing SSE/WebSocket listener in frontend (which this fix addresses).

## Completion Criteria

✅ Balance updates automatically when external transaction arrives  
✅ No manual refresh required  
✅ Console shows SSE/WebSocket events being received  
✅ Works for both SOL and SPL token deposits  

