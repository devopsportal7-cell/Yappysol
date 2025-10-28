# Balance Updates Not Working - Debug Checklist

## What I Changed (Helius Webhook Only)
- ✅ Created `HeliusWebhookService.ts` (NEW file)
- ✅ Created `webhooks.ts` route (NEW file)
- ✅ Modified `HeliusWebhookService.ts` initialization logic
- ❌ **DID NOT TOUCH** any WebSocket code
- ❌ **DID NOT TOUCH** any balance update logic

## What Could Be Affecting Balance Updates

### 1. WebSocket Connection Status
Check logs for:
```
[WS] Connection closed
[WS] Too many consecutive failures, disabling WebSocket
```

### 2. Background Service Disabled?
Background updates are disabled by default. Check log for:
```
⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)
```

### 3. WebSocket Not Subscribed?
Check logs for:
```
✅ WebSocket balance subscriber initialized - Real-time transaction detection enabled
[WSS] Subscribed to Solana wallet
```

## How to Check Render Logs

Look for these messages to diagnose:

### ✅ Working WebSocket:
```
[WS] Connected
[WSS] Subscribed to Solana wallet: { walletAddress: "..." }
```

### ❌ Broken WebSocket:
```
[WS] Connection closed { code: 429 }
[WS] Too many consecutive failures, disabling WebSocket
```

## Quick Fix

If WebSocket is failing, restart the Render service:
1. Go to Render dashboard
2. Manual Deploy → Clear build cache & Deploy

## Most Likely Cause

The webhook errors (400) are NOT affecting WebSocket. The issue is likely:

1. **WebSocket connection issues** (429 rate limits)
2. **No transactions happening** (balance won't update unless there's activity)
3. **WebSocket subscriptions not set up** (check if logs show subscriptions)

## Test Balance Updates

1. Send SOL to a monitored wallet
2. Check logs for:
   ```
   [WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!
   ```

If you don't see this, WebSocket is not detecting transactions.
