# Helius Rate Limit Analysis

## The Problem
```
error: [WSS] WebSocket error {"error":"Unexpected server response: 429"}
warn: [HELIUS] Binance API error {"status":451}
warn: [HELIUS] CoinGecko API error {"status":429}
error: [HELIUS] API error {"status":429,"statusText":"Too Many Requests"}
```

## Root Causes

### 1. **WebSocket Subscription Attempts (429 errors)**
The `WebsocketBalanceSubscriber` service is **DISABLED** but still attempting to connect:

```typescript
// From logs:
info: [WSS] Connecting to Solana WebSocket
error: [WSS] WebSocket error {"error":"Unexpected server response: 429"}

// From app.ts:
⏸️ WebSocket subscriber disabled (ENABLE_WEBSOCKET_CLIENT=false)
```

**Why the connection attempts?** The `WebsocketBalanceSubscriber` constructor calls `this.connect()` immediately on instantiation (line 17), even when disabled. This creates a WebSocket connection attempt that hits Helius rate limits.

### 2. **Background Balance Update Service (DISABLED)**
```
⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)
```
✅ This is correctly disabled, so it's not causing issues.

### 3. **Helius Test Route**
The test route `/helius-test` is being called on startup (likely from your testing), which makes API calls to Helius to test the connection.

### 4. **Portfolio Route Calls**
When users access the portfolio route, it:
1. Checks cache first ✅
2. If cache has zeros, fetches fresh from Helius
3. This triggers Helius API calls

### 5. **All Price APIs Failing**
```
warn: [HELIUS] Binance API error {"status":451}
warn: [HELIUS] CoinGecko API error {"status":429}
warn: [HELIUS] All price APIs failed, using market price fallback ($194)
```

**451 status from Binance:** Unavailable for legal reasons (Binance is blocked in some regions)
**429 status from CoinGecko:** Rate limit exceeded

## Solutions

### 1. **Fix WebSocket Constructor (URGENT)**
The `WebsocketBalanceSubscriber` should NOT auto-connect on instantiation when disabled.

**Current code (line 17):**
```typescript
constructor() {
  this.connect(); // ❌ This always connects, even when disabled
}
```

**Should be:**
```typescript
constructor() {
  // Only auto-connect if WebSocket is enabled
  if (process.env.ENABLE_WEBSOCKET_CLIENT === 'true') {
    this.connect();
  }
}
```

### 2. **Reduce Helius API Calls**
Currently, when the cache detects zeros, it forces a fresh fetch from Helius. This is good for accuracy but bad for rate limits.

**Consider:**
- Increasing cache TTL (time-to-live)
- Using "stale-while-revalidate" pattern
- Batch requests instead of individual calls
- Add exponential backoff for retries

### 3. **Implement Circuit Breaker**
When Helius returns 429, stop making requests for a cooldown period (e.g., 60 seconds).

### 4. **Use Alternative Price Sources**
For price data, consider:
- **Coinalyze API** (no rate limits mentioned)
- **Solana Labs RPC** (free tier: 80 req/sec)
- **GetBlock** (Solana API)
- **Triton** (Solana RPC aggregator)

### 5. **Aggressive Caching**
Cache everything possible:
- Token prices: Cache for 5-10 minutes
- Portfolio data: Cache for 30 seconds (user-initiated refresh can bypass)
- Token metadata: Cache for 1 hour
- Transaction history: Cache for 5 minutes

## Current State

### Services Status (from deployment logs):
✅ Background balance update: **DISABLED**
✅ WebSocket subscriber: **DISABLED** (but still attempting connections)
✅ Background updates: **DISABLED**

### What's Working:
- Backend server running
- Frontend WebSocket server working
- Cache system working
- Falls back to $194 SOL price when APIs fail

### What's Broken:
- Helius API: Rate limited (429 errors)
- Binance API: Blocked (451 errors)
- CoinGecko API: Rate limited (429 errors)
- WebSocket subscriber: Attempting connections even when disabled

## Immediate Fixes Needed

1. **Fix WebSocket auto-connect** (Line 17 in WebsocketBalanceSubscriber.ts)
2. **Add circuit breaker** for Helius API calls
3. **Increase cache durations** to reduce API calls
4. **Consider upgrading Helius plan** for higher rate limits

## Long-term Solutions

1. **Multiple API fallbacks:** Primary → Secondary → Tertiary
2. **Smart retry logic:** Exponential backoff with jitter
3. **Request queueing:** Batch requests to reduce API calls
4. **Local caching:** Use Supabase as cache layer
5. **Upgrade API plans:** Buy higher rate limit tiers

## Monitoring Recommendations

Add alerts for:
- Rate limit errors (429)
- Circuit breaker activations
- Cache hit/miss ratios
- API call frequency
- WebSocket reconnection attempts

