# Fix: Page Blanking/Hanging on Balance Update via WebSocket

## Problem Description

After implementing the WebSocket listener for real-time balance updates, a critical bug was introduced:

**Symptoms:**
1. ✅ Activity log updates correctly and immediately
2. ❌ When an external transaction is detected, the **receiver's page goes completely blank/hangs**
3. ❌ Balance does **NOT** update automatically
4. ✅ After manual page refresh, both activity log AND balance display correctly
5. ✅ The sender's account works fine
6. ✅ Both accounts work correctly after refresh

**Root Cause:**
The WebSocket `balance_update` message handler is causing the entire page to hang or blank when processing updates, likely due to:
- Blocking operations in the message handler
- Full page refresh being triggered incorrectly
- State updates causing component unmounting/remounting
- Missing or incomplete data in the WebSocket payload
- Unhandled errors in the message handler

## Investigation Steps

### 1. Check WebSocket Message Payload

**Location:** Check the WebSocket message being sent in DevTools Network tab → Socket → Messages

Verify that `balance_update` messages contain all necessary data:
```typescript
{
  type: 'balance_update',
  walletAddress: string,
  data: {
    reason: 'external_tx' | 'cache_update',
    updatedAt: string,
    totals: {
      totalSolValue: number,    // ✅ REQUIRED
      totalUsdValue: number     // ✅ REQUIRED
    },
    metadata?: {
      transactionHash?: string,
      amount?: number,
      tokenSymbol?: string,
      valueUsd?: number
    }
  }
}
```

**If data is missing:** The backend needs to include `totals` object with `totalSolValue` and `totalUsdValue`.

### 2. Review Current WebSocket Implementation

**File to Check:** `Yappysol/frontend/src/pages/Chat.tsx` or wherever the WebSocket listener was added

Look for:
- WebSocket message handler for `balance_update` type
- Any `window.location.reload()` or full page refresh calls
- State updates that might cause full component re-renders
- Missing error handling around WebSocket message processing
- Dependencies in `useEffect` that might cause infinite loops

### 3. Identify What's Causing the Blank/Hang

Common causes:
- **Blocking fetch/API calls** inside the WebSocket handler (should be async/non-blocking)
- **Full page refresh** triggered by the handler (`window.location.reload()`)
- **Component unmounting** due to state changes
- **Unhandled errors** causing React error boundary or crash
- **Missing conditional checks** before updating state

## Required Fix

### Fix 1: Make WebSocket Handler Non-Blocking and Error-Safe

```typescript
// Inside the component where WebSocket listener is added
useEffect(() => {
  if (!publicKey) return;

  // Get WebSocket connection (however it's established)
  const ws = /* your WebSocket connection */;
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    return;
  }

  const handleMessage = (event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      
      // Only handle balance_update messages for this wallet
      if (data.type === 'balance_update' && data.walletAddress === publicKey) {
        console.log('[BALANCE] Balance update received:', data);
        
        // CRITICAL: Use setTimeout to make this non-blocking
        // This prevents the handler from blocking the UI thread
        setTimeout(() => {
          try {
            // Check if data.totals exists and has required fields
            if (data.data?.totals?.totalSolValue !== undefined && 
                data.data?.totals?.totalUsdValue !== undefined) {
              
              // Update balance state (non-blocking)
              // This should only update the balance display, NOT trigger full page refresh
              setTotalSol(data.data.totals.totalSolValue);
              setTotalUsd(data.data.totals.totalUsdValue);
              
              // Optionally trigger a lightweight portfolio refetch (if needed)
              // But make it non-blocking and don't wait for it
              fetchPortfolio().catch(err => {
                console.error('[BALANCE] Error refetching portfolio:', err);
                // Don't crash - just log the error
              });
              
              console.log('[BALANCE] Balance updated successfully');
            } else {
              console.warn('[BALANCE] Incomplete data in balance_update:', data);
              // Silently ignore incomplete data - don't crash
            }
          } catch (updateError) {
            console.error('[BALANCE] Error updating balance:', updateError);
            // Don't crash - log and continue
          }
        }, 0); // Execute in next tick - non-blocking
      }
    } catch (parseError) {
      console.error('[BALANCE] Error parsing WebSocket message:', parseError);
      // Don't crash - log and continue
    }
  };

  ws.addEventListener('message', handleMessage);

  return () => {
    ws.removeEventListener('message', handleMessage);
  };
}, [publicKey, fetchPortfolio]); // Include fetchPortfolio in dependencies if it's stable
```

### Fix 2: Ensure Portfolio Refetch Doesn't Block

If `fetchPortfolio` function is called, make sure it's:
- **Asynchronous** (doesn't block the UI)
- **Has error handling** (doesn't crash on failure)
- **Doesn't trigger full page refresh**
- **Has timeout protection** (doesn't hang forever)

```typescript
const fetchPortfolio = useCallback(async () => {
  if (!publicKey) return;
  
  try {
    setLoading(true);
    
    // Add timeout protection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout
    
    const res = await fetch(`${apiUrl}/api/portfolio/${publicKey}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok) {
      throw new Error(`Portfolio fetch failed: ${res.status}`);
    }
    
    const tokens = await res.json();
    
    // Calculate totals...
    // Update state...
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.warn('[PORTFOLIO] Fetch timeout');
    } else {
      console.error('[PORTFOLIO] Error fetching portfolio:', error);
    }
    // Don't crash - just log and use existing state
  } finally {
    setLoading(false);
  }
}, [publicKey]);
```

### Fix 3: Never Trigger Full Page Refresh

**CRITICAL:** Ensure there are NO calls to:
- `window.location.reload()`
- `window.location.href = ...`
- `router.push()` without proper checks
- Any operation that unmounts the entire component tree

The WebSocket handler should ONLY update state, not trigger navigation or refresh.

### Fix 4: Verify Backend Payload Completeness

If the `balance_update` message doesn't include `totals`, we need to refetch. But do it safely:

```typescript
if (data.data?.totals?.totalSolValue !== undefined) {
  // Use the provided totals directly (fast)
  setTotalSol(data.data.totals.totalSolValue);
  setTotalUsd(data.data.totals.totalUsdValue);
} else {
  // If totals missing, trigger a lightweight refetch (non-blocking)
  console.warn('[BALANCE] Totals missing, triggering refetch');
  fetchPortfolio().catch(err => console.error('[BALANCE] Refetch error:', err));
}
```

### Fix 5: Add Loading State Protection

Ensure that loading states don't blank the UI:

```typescript
// Don't show blank/empty state while loading
{loading && totalSol === 0 && totalUsd === 0 ? (
  <div>Loading...</div> // Show loading indicator, not blank
) : (
  <div>
    {/* Display balance */}
  </div>
)}
```

## Testing Checklist

After implementing the fix:

1. ✅ Send funds from external wallet to receiver account
2. ✅ Verify receiver's page does NOT go blank/hang
3. ✅ Verify balance updates automatically (within 5-10 seconds)
4. ✅ Verify activity log continues to update correctly
5. ✅ Verify sender's account still works correctly
6. ✅ Verify no console errors appear
7. ✅ Verify WebSocket connection stays open (check Network tab)
8. ✅ Verify no full page refreshes are triggered
9. ✅ Test with multiple rapid transactions

## Expected Behavior After Fix

- **WebSocket message received** → Balance updates smoothly without page blanking
- **Activity log updates** → Works as before (already working)
- **Balance display** → Updates automatically within 5-10 seconds
- **Page stays responsive** → No hanging, no blank screen
- **Error handling** → Any errors are logged but don't crash the app
- **No manual refresh needed** → Everything updates automatically

## Backend Verification (If Needed)

If the issue persists, verify the backend is sending complete data. Check `Yappysol/backend/src/services/FrontendWebSocketServer.ts` to ensure `emitWalletUpdate` includes:

```typescript
{
  type: 'balance_update',
  walletAddress: wallet,
  data: {
    reason: payload.reason,
    updatedAt: payload.updatedAt,
    totals: payload.totals || {  // ✅ MUST include totals
      totalSolValue: portfolio.totalSolValue,
      totalUsdValue: portfolio.totalUsdValue
    },
    metadata: payload.metadata
  }
}
```

## Priority

🔴 **HIGH PRIORITY** - This is blocking real-time balance updates and causing poor user experience for receivers of external transactions.

