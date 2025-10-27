# Enable WebSocket Subscriber - Quick Setup

## Problem
The WebSocket subscriber is currently disabled, causing:
- ❌ No real-time balance updates
- ❌ Still attempting connections (wasting API calls)
- ❌ User experience: balances don't update in real-time

## Solution
Enable `ENABLE_WEBSOCKET_CLIENT` in your environment.

## How to Enable (in Doppler)

### Step 1: Log into Doppler
Go to https://dashboard.doppler.com and find your project

### Step 2: Add/Update Environment Variable
1. Navigate to your project
2. Select the environment (staging/production)
3. Click "Add Secret" or search for `ENABLE_WEBSOCKET_CLIENT`
4. Set the value to: `true`
5. Click "Save"

### Step 3: Deploy
After setting the variable in Doppler, your Render service will automatically redeploy with the new setting.

### Step 4: Verify
Check Render logs for:
```
✅ WebSocket balance subscriber initialized
```

Instead of:
```
⏸️ WebSocket subscriber disabled (ENABLE_WEBSOCKET_CLIENT=false)
```

## Current Configuration Status

From your deployment logs:
```
⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)
⏸️ WebSocket subscriber disabled (ENABLE_WEBSOCKET_CLIENT=false)
```

After enabling:
```
⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)
✅ WebSocket balance subscriber initialized
```

## Why This Helps with Rate Limits

### Before (Polling Every Hour):
- Calls Helius API for ALL wallets every hour
- 7 wallets × 3+ API calls each = 21+ calls per hour minimum
- More if users check portfolio manually

### After (WebSocket Real-Time):
- Only calls Helius API when a wallet balance actually changes
- Initial subscription: ~7 API calls (one-time setup)
- Subsequent updates: Only when transactions occur
- **Estimated: 5-10 API calls per day instead of 21+ per hour**

## Benefits

1. **Lower API usage**: Only fetches when balances actually change
2. **Faster updates**: Users see balance changes instantly
3. **Better UX**: Real-time portfolio updates
4. **Scalable**: Works efficiently with many wallets

## Configuration Summary

| Variable | Current | Recommended | Purpose |
|----------|---------|-------------|---------|
| `ENABLE_WEBSOCKET_CLIENT` | false | **true** | Real-time balance updates |
| `ENABLE_BACKGROUND_UPDATES` | false | **false** | Keep disabled (causes rate limits) |
| `SOLANA_WSS_URL` | Set ✅ | Set ✅ | WebSocket endpoint |
| `HELIUS_API_KEY` | Set ✅ | Set ✅ | API key for Helius |

## What Happens After Enabling

1. WebSocket connects to Solana mainnet
2. Subscribes to all user wallets (currently 7 wallets)
3. Listens for balance changes
4. When a change is detected:
   - Fetches fresh data from Helius (triggers once)
   - Updates the cache
   - Broadcasts to connected frontend clients
   - Frontend shows updated balance immediately

## Monitoring

Watch for these in logs:
- `✅ WebSocket balance subscriber initialized` - Success!
- `[WSS] Connected to Solana WebSocket` - Connection established
- `[WSS] Subscribed to Solana wallet` - Active subscriptions
- `[WSS] Solana account notification received` - Balance change detected
- `[REFRESH] Wallet refresh completed` - Cache updated

## Error Recovery

If you see:
```
error: [WSS] WebSocket error {"error":"Unexpected server response: 429"}
```

This means Helius WebSocket is rate limited, but:
- The service will automatically retry with exponential backoff
- It won't keep making API calls while retrying
- Once connected, it only calls APIs when balances change

## Rollback

If issues occur, simply set `ENABLE_WEBSOCKET_CLIENT=false` in Doppler and redeploy.

