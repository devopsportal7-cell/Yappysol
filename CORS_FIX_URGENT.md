# 🚨 CORS Error - Frontend Cannot Access Backend

## The Error

```
Access to fetch at 'https://yappysol.onrender.com/api/auth/wallets' 
from origin 'https://yappy-solana-yap-machine.lovable.app' 
has been blocked by CORS policy
```

## Root Cause

The backend's `FRONTEND_BASE_URL` environment variable in Doppler is missing or incorrect.

The backend expects:
```
FRONTEND_BASE_URL=https://yappy-solana-yap-machine.lovable.app
```

## Fix Required

### In Doppler (Backend Environment Variables):

Add or update:
```
FRONTEND_BASE_URL=https://yappy-solana-yap-machine.lovable.app
```

Or if you have multiple origins:
```
FRONTEND_BASE_URL=https://yappy-solana-yap-machine.lovable.app,https://preview--yappy-solana-yap-machine.lovable.app
```

## Why This Matters

Without this, the frontend cannot:
- ❌ Fetch wallet data
- ❌ Fetch portfolio data  
- ❌ Authenticate properly
- ❌ Show any balance information

This is why the frontend shows "$0.00" - it literally cannot fetch the data from the backend!

## Steps to Fix

1. Go to Doppler dashboard
2. Select your backend service (Yappysol Backend)
3. Add/update environment variable:
   - **Key:** `FRONTEND_BASE_URL`
   - **Value:** `https://yappy-solana-yap-machine.lovable.app`
4. Save changes
5. Render will auto-redeploy (or manually restart)

## Verification

After deploying, check browser console:
- Should see: "CORS: Allowing origin: https://yappy-solana-yap-machine.lovable.app"
- Should NOT see CORS errors anymore
- Frontend should be able to fetch wallet data
