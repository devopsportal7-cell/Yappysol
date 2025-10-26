# Frontend WebSocket Connection Fix - Urgent

## Issue
The frontend is showing this error in the console:
```
[WebSocket] Not configured for production, skipping connection
```

The frontend is trying to connect to `ws://localhost:8080/ws` from production (Lovable), but it should connect to your backend on Render.

## Solution Required

### 1. Add Environment Variable in Lovable Dashboard

Go to your Lovable project settings and add:
```
REACT_APP_WS_URL=wss://yappysol.onrender.com/ws
```

### 2. Update WebSocket Hook

**File:** `src/hooks/usePortfolioWebSocket.ts` (or wherever WebSocket connection is made)

**Current Code:**
```typescript
const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8080/ws';
```

**Replace with:**
```typescript
// Determine WebSocket URL based on environment
const getWebSocketUrl = () => {
  // Check environment variable first (set in Lovable dashboard)
  if (process.env.REACT_APP_WS_URL) {
    return process.env.REACT_APP_WS_URL;
  }
  
  // For production (Lovable), connect to Render backend
  if (window.location.hostname.includes('lovable') || 
      window.location.hostname.includes('lovable.dev') ||
      process.env.NODE_ENV === 'production') {
    return 'wss://yappysol.onrender.com/ws';
  }
  
  // For local development
  return 'ws://localhost:8080/ws';
};

const wsUrl = getWebSocketUrl();
console.log('[WebSocket] Connecting to:', wsUrl);
```

### 3. Remove Any Environment Checks That Block Production

If there's code that checks for localhost and skips connection in production, remove it or update it:

**Find and remove code like:**
```typescript
// ❌ REMOVE THIS
if (window.location.hostname === 'localhost') {
  console.warn('[WebSocket] Not configured for production, skipping connection');
  return;
}
```

Or replace with:
```typescript
// ✅ USE THIS INSTEAD
const isProduction = window.location.hostname.includes('lovable') || 
                     window.location.hostname.includes('lovable.dev');
if (isProduction) {
  // Still connect, but use production WebSocket URL
  console.log('[WebSocket] Connecting to production backend');
}
```

## Testing

After deployment:
1. Open browser DevTools console
2. Should see: `[WebSocket] Connecting to: wss://yappysol.onrender.com/ws`
3. Should see: `WebSocket connected successfully`
4. No more "Not configured for production" warning

## Priority
**URGENT** - WebSocket connection is required for real-time balance updates. Without this, users won't see balance changes in real-time.

## Additional Info
- Backend WebSocket server: Running on Render at `wss://yappysol.onrender.com:8080`
- Frontend should connect to: `wss://yappysol.onrender.com/ws`
- The `/ws` endpoint is handled by your backend's frontend WebSocket server
