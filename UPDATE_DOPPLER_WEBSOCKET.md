# Update Doppler WebSocket URL

## Quick Fix

Update the `SOLANA_WSS_URL` in Doppler to use the native Solana WebSocket instead of Helius.

## In Doppler

### Go to Your Project Settings:
1. Open Doppler dashboard
2. Select your Yappysol backend project
3. Go to Environment Variables

### Find `SOLANA_WSS_URL`:
**Current (Wrong):**
```
SOLANA_WSS_URL=wss://mainnet.helius-rpc.com/?api-key=4ef3a4ea-1010-41e8-bfea-884eeed32faa
```

**New (Correct):**
```
SOLANA_WSS_URL=wss://api.mainnet-beta.solana.com
```

### Update It:
1. Click on `SOLANA_WSS_URL`
2. Change to: `wss://api.mainnet-beta.solana.com`
3. Save changes
4. Redeploy

## After Update

The logs should show:
```
[WSS] Connecting to Solana WebSocket: wss://api.mainnet-beta.solana.com
```

Instead of:
```
[WSS] Connecting to Solana WebSocket: wss://mainnet.helius-rpc.com/?api-key=...
```

## Why This Works

### Native Solana WebSocket:
- ✅ **Official Solana endpoint**
- ✅ **Public and free**
- ✅ **No API key needed**
- ✅ **More stable**

### Helius WebSocket:
- ❌ **Rate limited (429 errors)**
- ❌ **Requires API key**
- ❌ **May have connection limits**

## Expected Result

After updating Doppler and redeploying:

```
[WSS] Connecting to Solana WebSocket: wss://api.mainnet-beta.solana.com
[WSS] Connected to Solana WebSocket
[WSS] Subscribed to Solana wallet: YeGXtB3ve7dRd9tV9JNxRB76oRLns5QS1FujsqpzBnG
[WSS] Solana subscription confirmed
```

Then when you send SOL, you'll see:
```
[WSS] ✅ TRANSACTION DETECTED via Solana WebSocket!
[WSS] 🔍 Checking for external transactions...
[EXTERNAL_TX] Found 1 new external transactions
[EXTERNAL_TX] Stored external transaction
```

## Quick Steps

1. **Open Doppler** dashboard
2. **Find** `SOLANA_WSS_URL` 
3. **Change** to: `wss://api.mainnet-beta.solana.com`
4. **Save**
5. **Redeploy** (or wait for auto-redeploy)

That's it! 🚀

