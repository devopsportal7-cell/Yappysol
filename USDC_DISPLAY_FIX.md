# USDC Display Fix

## Problem

User had USDC in their wallet, but it was showing as "UNKNOWN" in the frontend with:
- `symbol: "UNKNOWN"`
- `priceUsd: 0`
- `usdEquivalent: null`
- `solEquivalent: null`

## Root Cause

Helius API doesn't always return metadata (symbol, name, image) for tokens. When a token has no metadata:
1. Backend falls back to "UNKNOWN"
2. Price lookup fails → `priceUsd: 0`
3. USD equivalent calculation → `null` (can't multiply by 0)
4. Frontend displays as "UNKNOWN 0.00 $0.00"

## Solution

### 1. Created `TokenMetadataService.ts`

A service that provides metadata for popular Solana tokens:

```typescript
KNOWN_TOKENS = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
    symbol: 'USDC',
    name: 'USD Coin',
    image: 'https://...',
    decimals: 6
  },
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
    symbol: 'USDT',
    name: 'Tether',
    ...
  },
  // ... more tokens
}

STABLECOIN_PRICES = {
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0, // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.0, // USDT
}
```

### 2. Updated `HeliusBalanceService.ts`

Now enriches token data with metadata before processing:

```typescript
// Before processing each token
const enrichedToken = TokenMetadataService.enrichToken(token);

// Use stablecoin price if applicable
let priceUsd = await this.getTokenPrice(token.mint);
if (TokenMetadataService.isStablecoin(token.mint)) {
  priceUsd = TokenMetadataService.getStablecoinPrice(token.mint); // Always 1.0 for USDC/USDT
}

// Use enriched metadata
processedTokens.push({
  symbol: enrichedToken.symbol || 'UNKNOWN', // Now 'USDC' instead of 'UNKNOWN'
  name: enrichedToken.name || enrichedToken.symbol,
  priceUsd, // Now 1.0 instead of 0
  // ... rest of fields
});
```

## How It Works Now

### Backend Response (Before Fix):
```json
{
  "tokens": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "UNKNOWN",
      "priceUsd": 0,
      "usdEquivalent": null
    }
  ]
}
```

### Backend Response (After Fix):
```json
{
  "tokens": [
    {
      "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
      "symbol": "USDC",
      "name": "USD Coin",
      "priceUsd": 1.0,
      "usdEquivalent": 3.96,
      "uiAmount": 3.96,
      "image": "https://..."
    }
  ]
}
```

## What Gets Displayed

After the fix, USDC will display exactly like SOL:
- **Symbol:** USDC (not UNKNOWN)
- **Balance:** 3.96 USDC
- **Value:** $3.96
- **Logo:** USDC logo image

## Frontend Handling

The frontend should already handle this correctly, but here's what it receives:

### `/api/wallets` Response:
```json
{
  "wallets": [{
    "portfolio": {
      "tokens": [
        {
          "symbol": "SOL",
          "uiAmount": 0.0177,
          "usdEquivalent": 3.44
        },
        {
          "symbol": "USDC",
          "uiAmount": 3.96,
          "usdEquivalent": 3.96
        }
      ]
    }
  }]
}
```

### Frontend Display Logic:
```typescript
// The frontend should already be showing this correctly from /api/wallets
portfolio.tokens.forEach(token => {
  console.log(`${token.symbol}: ${token.uiAmount} ($${token.usdEquivalent})`);
});
// Output:
// SOL: 0.0177 ($3.44)
// USDC: 3.96 ($3.96)
```

## Supported Tokens

Currently supported in metadata service:
- SOL (Solana)
- USDC (USD Coin)
- USDT (Tether)
- BONK
- RAY (Raydium)

To add more tokens, update `KNOWN_TOKENS` in `TokenMetadataService.ts`.

## Summary

✅ **Backend:** USDC now has proper metadata (symbol, name, image)
✅ **Prices:** Stablecoins (USDC/USDT) use $1.00 price
✅ **Frontend:** Will display USDC correctly like SOL
✅ **Database:** Swap tracking now logged for Solana Tracker swaps

