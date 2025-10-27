# Multi-Token Price Extraction Fix

## Problem
When users asked for multiple token prices (e.g., "what is the price of bonk and sol"), the bot would only return the price of the first token mentioned.

## Root Cause
The Entity Extractor's AI prompt for `price` intent was only extracting a single token:
```typescript
// OLD (line 103-106)
price: `Extract price query entities from the user message.
- tokenSymbol: Token to get price for
Examples:
"price of SOL" → {"tokenSymbol": "SOL"}
```

This caused the AI to only extract one token even when multiple were mentioned.

## Solution
Updated the prompt to extract ALL tokens as an array:

```typescript
// NEW (line 103-116)
price: `Extract price query entities from the user message.
- tokenSymbols: Array of all token symbols mentioned (can be multiple)

Examples:
"price of SOL" → {"tokenSymbols": ["SOL"]}
"how much is BONK" → {"tokenSymbols": ["BONK"]}
"what is the price of bonk and sol" → {"tokenSymbols": ["BONK", "SOL"]}
"price of SOL and BONK" → {"tokenSymbols": ["SOL", "BONK"]}

IMPORTANT: Extract ALL mentioned tokens, not just one!

Return format: {"tokenSymbols": ["TOKEN1", "TOKEN2", ...]}`
```

## What Changed

### File Modified
`Yappysol/backend/src/services/EntityExtractor.ts`

### Changes
1. Updated prompt to extract `tokenSymbols` (array) instead of `tokenSymbol` (single)
2. Added explicit instruction: "Extract ALL mentioned tokens"
3. Added examples for multiple tokens
4. Updated return format to array format

### How It Works Now

#### Before Fix:
```
User: "what is the price of bonk and sol"
Bot: [Extracts only SOL]
Response: "The current price of SOL is $204.6972 USD"
[Missing BONK price]
```

#### After Fix:
```
User: "what is the price of bonk and sol"
Bot: [Extracts both ["BONK", "SOL"]]
Response: 
  "The current prices are:
  - BONK: $0.0000XXX USD
  - SOL: $204.6972 USD"
```

## Technical Details

### Entity Extraction Flow
1. AI Intent Classifier detects `price` intent
2. EntityExtractor extracts entities using AI prompt
3. If multiple tokens mentioned, `tokenSymbols` array is populated
4. ChatService fetches prices for all tokens
5. TokenPriceService returns multiple prices
6. AI generates conversational response with all prices

### Current Implementation
- `extractPriceEntities()` (keyword-based) already supports multiple tokens (lines 310-336)
- `extractWithAI()` (AI-based) now supports multiple tokens with updated prompt
- Both paths now correctly extract multiple tokens

## Testing Scenarios

### Multi-Token Queries Now Supported:
- "what is the price of bonk and sol"
- "show me prices for SOL, BONK, and WIF"
- "how much is USDC and USDT"
- "price of SOL and BONK"
- "bonk sol price"

### Single Token (Still Works):
- "price of SOL"
- "how much is BONK"
- "what's the price of WIF"

## Deployment
- ✅ Build successful (TypeScript compiled)
- ✅ Deploy to production
- ✅ Test with real queries

## Files Changed
1. `Yappysol/backend/src/services/EntityExtractor.ts` - Updated AI prompt for price intent

## Impact
- **User Experience:** Users can now get multiple token prices in a single query
- **Efficiency:** One API call instead of multiple separate queries
- **Natural Language:** More conversational and useful responses

## Related Files
- `ChatService.ts` (line 854-861) - Uses `tokenSymbols` array to fetch multiple prices
- `TokenPriceService.ts` (line 109-119) - `getMultipleTokenPrices()` method handles array

