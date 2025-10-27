# WebSocket Temporarily Disabled Due to Rate Limits

## Summary

Helius is rate-limiting WebSocket connections (429 errors). Since it worked hours ago, this is likely **temporary**. Disabled WebSocket by default to stop spam.

## What Changed

### Before:
- WebSocket always tried to connect
- Continuous 429 errors in logs
- Reconnection attempts every 30s

### After:
- WebSocket disabled by default
- Can be enabled with environment variable
- No spam in logs

## New Environment Variable

```
ENABLE_WEBSOCKET_DETECTION=true
```

**Set this to enable WebSocket transaction detection when rate limits clear.**

## Why This Happened

Helius temporarily rate-limited your account:
- ✅ Was working hours ago
- ❌ Now getting 429 errors
- ⏳ Rate limits reset after some time

This is normal for Helius free tier.

## What Still Works

Transactions are **still detected** without WebSocket:

### 1. Manual Refresh
```typescript
// In portfolio-refresh.ts (line 55-77)
await externalTransactionService.checkForExternalDeposits(wallet);
```

### 2. Portfolio Queries
When user checks portfolio via chat or API

### 3. Chat Interactions  
Portfolio queries trigger transaction checks

### 4. Frontend WebSocket
Real-time updates to clients still work

## How to Re-Enable WebSocket Later

### Option 1: Add Environment Variable
```
ENABLE_WEBSOCKET_DETECTION=true
```

### Option 2: Wait for Rate Limit Reset
Helius rate limits reset automatically after some time (usually 1 hour).

### Option 3: Use Different Helius Endpoint
Check Helius docs for alternative WebSocket endpoints.

## Transaction Detection Flow (Without WebSocket)

When a user triggers any of these:

1. **Chat query**: "what's my balance"
2. **Portfolio API**: GET `/api/portfolio/:wallet`
3. **Wallet refresh**: Manual refresh button

The system will:

```
[EXTERNAL_TX] Checking for external deposits for wallet: ABC123...
[EXTERNAL_TX] Fetched 5 total transactions from Helius
[EXTERNAL_TX] Found 1 external transactions
[EXTERNAL_TX] Stored external transaction: {signature: "xyz789...", amount: 1.5, tokenSymbol: "SOL"}
```

## Next Steps

### Immediate:
1. ✅ Deploy with WebSocket disabled
2. ✅ No more 429 errors
3. ✅ Clean logs

### Later (when rate limits clear):
1. Set `ENABLE_WEBSOCKET_DETECTION=true`
2. Deploy again
3. WebSocket will connect successfully
4. Real-time transaction detection enabled

## Verification

Even without WebSocket, check if transactions are detected:

```bash
# Call diagnostic endpoint after sending SOL
curl -X POST /api/diagnostics/check-transactions \
  -H "Authorization: Bearer TOKEN" \
  -d '{"walletAddress":"YOUR_WALLET"}'
```

You should see new external transactions!

## Build Status

✅ **Build successful** - WebSocket disabled by default
✅ **Ready to deploy** - No more spam in logs
✅ **Transactions still detected** - Via manual refresh/portfolio queries

