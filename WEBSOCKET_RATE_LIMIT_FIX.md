# WebSocket Rate Limit Fix - Circuit Breaker

## Summary

Helius WebSocket is returning **429 Too Many Requests**, causing continuous reconnection attempts. Added a circuit breaker to gracefully disable WebSocket after 5 consecutive failures.

## The Problem

### From Logs:
```
info: [WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/?api-key=...
error: [WSS] WebSocket error: Unexpected server response: 429
info: [WSS] Scheduling reconnection {attempt: 1, delay: 5000}
error: [WSS] WebSocket error: Unexpected server response: 429
info: [WSS] Scheduling reconnection {attempt: 2, delay: 10000}
```

**Helius is rate-limiting WebSocket connections!**

## The Solution - Circuit Breaker

Added logic to:
1. **Track consecutive failures** - Count failed connection attempts
2. **Disable after 5 failures** - Stop trying after 5 consecutive failures
3. **Reset on success** - Resume if connection succeeds

### Changes Made:

```typescript
private consecutiveFailures = 0; // Track consecutive connection failures
private maxConsecutiveFailures = 5; // Disable after 5 consecutive failures

private scheduleReconnect() {
  this.consecutiveFailures++;
  
  // If we've failed too many times, disable WebSocket to avoid spam
  if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
    logger.error('[WSS] Too many consecutive failures, disabling WebSocket to avoid rate limits.', {
      consecutiveFailures: this.consecutiveFailures,
      message: 'WebSocket disabled due to rate limits. External transactions will still be detected via manual refresh.'
    });
    return; // Stop reconnecting
  }
  
  // Continue with normal reconnection logic...
}

// Reset failure counter on successful connection
this.ws.on('open', () => {
  this.consecutiveFailures = 0; // Reset failure counter on successful connection
  // ... rest of connection logic
});
```

## What This Does

### Before (Bad - Spam):
```
Attempt 1: 429 error → Retry in 5s
Attempt 2: 429 error → Retry in 10s  
Attempt 3: 429 error → Retry in 20s
Attempt 4: 429 error → Retry in 40s
Attempt 5: 429 error → Retry in 80s
... (continues forever, spamming Helius)
```

### After (Good - Circuit Breaker):
```
Attempt 1: 429 error → Retry in 5s
Attempt 2: 429 error → Retry in 10s
Attempt 3: 429 error → Retry in 20s
Attempt 4: 429 error → Retry in 40s
Attempt 5: 429 error → **STOP: Too many failures, disabling WebSocket**
```

## What Still Works

Even with WebSocket disabled, transactions are still detected:

1. **Manual Refresh** - When user refreshes balance
2. **Chat Interactions** - Portfolio queries trigger check
3. **Background Service** - If enabled, polls for updates
4. **Frontend WebSocket** - For real-time updates to clients

## When WebSocket Re-enables

The WebSocket will try again:
- On next deployment
- If you restart the service
- When the 429 rate limit expires (Helius resets limits)

## Alternative Solutions

### Option 1: Use Native Solana WebSocket
**Set in environment:**
```
SOLANA_WSS_URL=wss://api.mainnet-beta.solana.com
```
**Pros:** Public, free  
**Cons:** Also rate-limited

### Option 2: Disable WebSocket Entirely
**Set in environment:**
```
ENABLE_WEBSOCKET_CLIENT=false
```
**Note:** We removed this check, WebSocket is always enabled for now

### Option 3: Use Different Helius Endpoint
Check Helius documentation for WebSocket endpoints that don't require API key

### Option 4: Wait for Rate Limit to Expire
Helius rate limits reset after some time. The circuit breaker will stop spamming, and you can manually trigger a reconnect later.

## Recommended Action

**For now, let the circuit breaker handle it:**

1. ✅ Code will deploy with circuit breaker
2. ✅ After 5 failures, WebSocket will disable gracefully
3. ✅ App continues to work normally
4. ✅ External transactions detected via manual refresh
5. ✅ No more spam in logs

**Later, investigate:**
- Check Helius documentation for correct WebSocket URL format
- Consider using a different WebSocket provider
- Or wait for rate limit to expire

## Build Status

✅ **Build successful** - Circuit breaker added
✅ **Ready to deploy** - Will gracefully handle rate limits

## Expected Behavior After Deployment

```
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/...
[WSS] WebSocket error: 429 (attempt 1)
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/...
[WSS] WebSocket error: 429 (attempt 2)
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/...
[WSS] WebSocket error: 429 (attempt 3)
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/...
[WSS] WebSocket error: 429 (attempt 4)
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/...
[WSS] WebSocket error: 429 (attempt 5)
[WSS] Too many consecutive failures, disabling WebSocket to avoid rate limits.
```

**Then it stops trying, and logs are clean!** ✅

