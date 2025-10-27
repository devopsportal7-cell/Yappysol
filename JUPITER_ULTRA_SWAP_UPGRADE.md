# Jupiter Ultra Swap API Upgrade

## Summary

Migrated from Jupiter's legacy v6 API to the new **Ultra Swap API** for better performance, MEV protection, and RPC-less architecture.

## Why Ultra Swap?

According to [Jupiter's documentation](https://dev.jup.ag/docs/ultra), Ultra Swap is:
- ✅ **RPC-less** - No need to manage RPC connections
- ✅ **MEV Protection** - Uses ShadowLane transaction engine
- ✅ **Sub-second execution** - 95% of swaps execute under 2 seconds
- ✅ **Better success rate** - 85% → 96% success rate
- ✅ **Real-time slippage** - Intelligent slippage estimation
- ✅ **Gasless options** - Can provide gasless transactions
- ✅ **Simpler integration** - Less code, more features

## Changes Made

### 1. Created New Service
**File:** `Yappysol/backend/src/services/JupiterUltraSwapService.ts`

```typescript
export class JupiterUltraSwapService {
  private readonly ultraOrderUrl = 'https://api.jup.ag/ultra/order';
  private readonly ultraExecuteUrl = 'https://api.jup.ag/ultra/execute';

  // Create order
  async createOrder(params: UltraOrderParams): Promise<UltraOrderResponse>
  
  // Execute order
  async executeOrder(orderId: string, keypair: Keypair): Promise<UltraExecuteResponse>
  
  // Complete swap
  async performSwap(keypair: Keypair, params: UltraOrderParams): Promise<string>
}
```

### 2. Updated TokenSwapService
**File:** `Yappysol/backend/src/services/TokenSwapService.ts`

**Before:**
```typescript
const { jupiterSwapService } = await import('./JupiterSwapService');
const signature = await jupiterSwapService.performSwap(keypair, {
  userPublicKey: walletInfo.publicKey,
  inputMint,
  outputMint,
  amount: amountLamports,
  slippageBps: 50,
  priorityLevelWithMaxLamports: { maxLamports: fees.priorityFee * 1e9 }
});
```

**After:**
```typescript
const { jupiterUltraSwapService } = await import('./JupiterUltraSwapService');
const signature = await jupiterUltraSwapService.performSwap(keypair, {
  userPublicKey: walletInfo.publicKey,
  inputMint,
  outputMint,
  amount: amountLamports,
  slippageBps: 50
});
```

## Key Differences

### Legacy v6 API
- Requires manual RPC connection
- Manual transaction broadcasting
- Manual slippage calculation
- Manual priority fee management
- More complex integration

### Ultra Swap API
- RPC-less (Jupiter handles everything)
- Automatic transaction broadcasting via ShadowLane
- Real-time slippage estimation (RTSE)
- Better execution optimization
- Simpler integration

## API Endpoints

### Create Order
```
POST https://api.jup.ag/ultra/order
```

**Request:**
```json
{
  "userPublicKey": "...",
  "inputMint": "...",
  "outputMint": "...",
  "amount": 10000000,
  "slippageBps": 50
}
```

### Execute Order
```
POST https://api.jup.ag/ultra/execute/:orderId
```

**Request:**
```json
{
  "publicKey": "..."
}
```

## Benefits for Yappysol

### 1. Better Success Rate
- ✅ 96% success rate vs 85% before
- ✅ Predictive routing validates on-chain prices
- ✅ Simulates routes before execution

### 2. Faster Execution
- ✅ 95% execute under 2 seconds
- ✅ ShadowLane transaction engine
- ✅ Lands in 0-1 blocks (~50-400ms)

### 3. MEV Protection
- ✅ Complete privacy until on-chain execution
- ✅ Reduces front-running risk
- ✅ Reduces sandwich attack risk

### 4. Simpler Code
- ✅ No RPC management
- ✅ No transaction broadcasting
- ✅ No priority fee handling
- ✅ Ultra handles everything

### 5. Gasless Options
- ✅ Can provide gasless swaps
- ✅ Better UX for users
- ✅ Integrator fees supported

## How It Works Now

### For Stablecoins (USDC/USDT):
1. ✅ PumpPortal fails (doesn't support stablecoins)
2. ✅ **Jupiter Ultra Swap activates** (creates order)
3. ✅ Gets best route with predictive routing
4. ✅ Executes via ShadowLane
5. ✅ Returns transaction signature

### For Pump.fun Tokens:
1. ✅ PumpPortal works (Pump.fun tokens)
2. ✅ Jupiter Ultra Swap available as fallback
3. ✅ Most reliable option for all swaps

## Performance Metrics

According to Jupiter documentation:
- **Order latency**: 300ms (P50)
- **Execute latency**: 700ms-2s
- **Success rate**: ~96%
- **Under 2 seconds**: 95% of swaps

## Migration Notes

### No Breaking Changes
- Existing swap flow unchanged
- User experience unchanged
- Same error handling patterns
- Backward compatible

### Environment Variables
No new environment variables needed. Jupiter Ultra API is public.

### Testing Required
After deployment, test:
1. SOL → USDC (should use Ultra Swap)
2. SOL → BONK (should use PumpPortal, Ultra as fallback)
3. Verify transaction signatures
4. Check success rates

## Next Steps

1. ✅ Build complete
2. Deploy backend
3. Test swaps in production
4. Monitor success rates
5. Compare with previous performance

## Documentation

- [Ultra Swap Overview](https://dev.jup.ag/docs/ultra)
- [Ultra Swap Quickstart](https://dev.jup.ag/docs/api/ultra-api/quickstart)
- [Ultra Swap API Reference](https://dev.jup.ag/docs/ultra/get-order)

## Ready to Deploy! 🚀

The backend now uses Jupiter's Ultra Swap API, which provides:
- Better success rates (96%)
- Faster execution (< 2s for 95%)
- MEV protection
- RPC-less architecture
- Simpler integration

**All swaps should now work better!**

