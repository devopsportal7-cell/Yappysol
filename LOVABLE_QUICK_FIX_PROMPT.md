# Fix Real-Time Balance Updates in Chat Page

## Problem
When external transactions arrive, the **activity log updates immediately** but **balance does NOT update automatically**. Users must manually refresh to see new balance.

## Cause
The WebSocket connection exists (`wss://yappysol.onrender.com/ws`) but the frontend doesn't listen to balance update events.

## Solution
Add a WebSocket message listener in `useTotalPortfolioBalances` hook to refetch balance when backend sends `wallet_updated` event.

## File to Edit
`Yappysol/frontend/src/pages/Chat.tsx` - Line 251 (inside `useTotalPortfolioBalances` function)

## Code to Add
Add this `useEffect` hook AFTER the existing `useEffect` on line 288:

```typescript
// Listen to WebSocket for real-time balance updates
useEffect(() => {
  if (!publicKey) return;

  // Get WebSocket connection from window (if it exists)
  const ws = (window as any).ws;
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.log('[BALANCE] WebSocket not available');
    return;
  }

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('[BALANCE] WebSocket message received:', data);
      
      // Listen for wallet_updated events
      if (data.type === 'wallet_updated' && data.wallet === publicKey) {
        console.log('[BALANCE] Balance update event received, refetching...');
        fetchPortfolio();
      }
    } catch (error) {
      console.error('[BALANCE] Error parsing WebSocket message:', error);
    }
  };

  ws.addEventListener('message', handleMessage);

  return () => {
    ws.removeEventListener('message', handleMessage);
  };
}, [publicKey, fetchPortfolio]);
```

## Alternative: If WebSocket Isn't Available
If the WebSocket connection isn't accessible, use polling instead:

```typescript
// Poll for balance updates every 10 seconds
useEffect(() => {
  if (!publicKey) return;

  const interval = setInterval(() => {
    fetchPortfolio();
  }, 10000); // Poll every 10 seconds

  return () => clearInterval(interval);
}, [publicKey, fetchPortfolio]);
```

## Expected Result
- ✅ Balance updates automatically within 3-5 seconds after external transaction
- ✅ No manual refresh required
- ✅ Console shows `[BALANCE] Balance update event received` logs

## Testing
1. Open browser console
2. Send SOL from external wallet to user's wallet
3. Watch console for `[BALANCE] Balance update event received`
4. Verify balance updates without manual refresh

