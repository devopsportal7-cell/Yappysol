# Jupiter Swap Fix Summary

## Problem
Swaps were failing with `AxiosError: getaddrinfo ENOTFOUND quote-api.jup.ag` due to:
1. Outdated Jupiter API endpoints (`quote-api.jup.ag`)
2. No DNS caching
3. Missing IPv4 preference
4. No fallback mechanism

## Solution Implemented

### 1. Shared HTTP Client with DNS Caching (`src/lib/httpClient.ts`)
- Added `cacheable-lookup` for DNS caching
- Configured `maxTtl: 60s` and `errorTtl: 1s` for quick recovery
- Enforced IPv4 only (`family: 4`) for consistent DNS resolution
- Enabled HTTP keep-alive for better connection reuse
- Set 10 second timeout

### 2. Jupiter v1 API Endpoints (`src/constants/jupiter.ts`)
- Replaced old `quote-api.jup.ag/v6` with Jupiter v1 endpoints:
  - Pro: `https://api.jup.ag/swap/v1/quote` (primary)
  - Lite: `https://lite-api.jup.ag/swap/v1/quote` (fallback)
  - Swap: `https://api.jup.ag/swap/v1/swap`

### 3. Rewritten Jupiter Service (`src/services/JupiterSwapService.ts`)
- **Fallback logic**: Tries Pro endpoint first, automatically falls back to Lite if Pro fails
- **Correct parameter**: Uses `inAmount` (not `amount`) as required by v1 API
- **Lamports conversion**: Already handled by caller (0.01 SOL → 10,000,000 lamports)
- **Improved logging**: Tracks which endpoint succeeded

### 4. Health Endpoint (`src/routes/health.ts`)
- `GET /health/jupiter` - Tests Jupiter API connectivity
- `GET /health` - Basic health check
- Useful for monitoring and debugging

### 5. App Integration (`src/app.ts`)
- Mounted health routes at `/health`

## Changes Summary

**New Files:**
- `src/lib/httpClient.ts` - Shared Axios client with DNS caching
- `src/constants/jupiter.ts` - Jupiter API endpoints
- `src/routes/health.ts` - Health check endpoints

**Modified Files:**
- `src/services/JupiterSwapService.ts` - Complete rewrite with v1 API and fallback
- `src/app.ts` - Added health routes

**Dependencies:**
- Added `cacheable-lookup` package

## Amount Conversion

The amount conversion is **correct**:
- For SOL → Token (buy): `0.01 * 1e9 = 10,000,000` lamports ✅
- For Token → SOL (sell): `amount * 1e6` (assumes 6 decimals for USDT/USDC) ✅

## Testing

### Local Testing
```bash
# 1. Start the server
npm run build && npm start

# 2. Check health endpoint
curl http://localhost:PORT/health/jupiter
# Expected: { "ok": true, "via": "pro/lite", ... }

# 3. Try a swap from chat
# "swap 0.01 SOL to USDC"
# Should succeed without ENOTFOUND error
```

### Render Environment Variables
Add these to Render → Environment to improve DNS reliability:
```
NODE_OPTIONS=--dns-result-order=ipv4first
RES_OPTIONS=single-request
```

## Expected Behavior

1. **First request**: Tries Jupiter Pro API
2. **On failure**: Automatically falls back to Jupiter Lite API
3. **DNS errors**: Greatly reduced due to caching and IPv4 preference
4. **Logging**: Clear indication of which endpoint was used
5. **Error messages**: User-friendly messages when both endpoints fail

## Verification Checklist

- [x] No more references to `quote-api.jup.ag`
- [x] DNS caching enabled
- [x] IPv4 preference enabled
- [x] Fallback mechanism implemented
- [x] Health endpoint available
- [x] Build succeeds without errors
- [ ] Deploy to Render
- [ ] Test swap functionality in production
- [ ] Add environment variables to Render

## Next Steps

1. **Deploy** the updated backend to Render
2. **Add environment variables** in Render dashboard
3. **Test swap** with "0.01 SOL to USDC" in production
4. **Monitor logs** for any remaining DNS errors
5. **Verify health endpoint** at `https://your-backend.onrender.com/health/jupiter`

