# Swap Transaction Tracking

## Overview
This system tracks all swap transactions performed through Yappysol, providing detailed history, analytics, and audit capabilities.

## Database Schema

### Table: `swap_transactions`

Tracks individual swap transactions with:
- **Identity**: `id`, `user_id`, `wallet_id`
- **Swap Details**: `from_token_mint`, `from_token_symbol`, `from_token_amount`, `to_token_mint`, `to_token_symbol`, `to_token_amount`
- **Transaction Info**: `transaction_signature`, `solscan_url`, `execution_provider`
- **Execution Parameters**: `slippage_bps`, `priority_fee`
- **Status**: `status` (pending, confirmed, failed, reverted)
- **Timestamps**: `created_at`, `updated_at`, `confirmed_at`, `block_time`
- **Additional**: `fee_amount`, `notes`

### View: `swap_analytics`

Provides aggregated swap statistics:
- Daily swap counts
- Success/failure rates
- Volume metrics
- Fee analysis
- Provider usage

## Usage

### Record a Swap

```typescript
import { swapTrackingService } from './services/SwapTrackingService';

await swapTrackingService.recordSwap({
  user_id: 'user-uuid',
  wallet_id: 'wallet-uuid',
  from_token_mint: 'So11111111111111111111111111111111111111112',
  from_token_symbol: 'SOL',
  from_token_amount: 1.5,
  to_token_mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  to_token_symbol: 'USDC',
  to_token_amount: 300,
  transaction_signature: '5uJh...',
  execution_provider: 'jupiter',
  slippage_bps: 50,
  priority_fee: 0.0005,
  status: 'confirmed',
  confirmed_at: new Date(),
  fee_amount: 0.001
});
```

### Update Swap Status

```typescript
await swapTrackingService.updateSwapStatus(
  '5uJh...', // signature
  'confirmed',
  new Date(), // blockTime
  0.001, // feeAmount
  300 // toTokenAmount
);
```

### Get User's Swap History

```typescript
const swaps = await swapTrackingService.getUserSwapHistory(
  'user-uuid',
  50, // limit
  0   // offset
);
```

### Get Analytics

```typescript
const analytics = await swapTrackingService.getUserSwapAnalytics('user-uuid');
// Returns daily aggregated statistics
```

## Integration with TokenSwapService

To integrate with `TokenSwapService.ts`, add tracking calls after successful swaps:

```typescript
// After successful swap
await swapTrackingService.recordSwap({
  user_id: userId,
  wallet_id: walletInfo.id,
  from_token_mint: session.fromToken,
  from_token_symbol: fromSymbol,
  from_token_amount: session.amount,
  to_token_mint: session.toToken,
  to_token_symbol: toSymbol,
  to_token_amount: toAmount,
  transaction_signature: signature,
  execution_provider: 'jupiter' // or 'pumpportal'
});
```

## Setup

1. Run the database schema migration:
```bash
psql -h your-db-host -U your-user -d your-db -f database-schema-swap-tracking.sql
```

2. The table will automatically track:
   - All swap transactions
   - User swap history
   - Success/failure rates
   - Volume metrics
   - Provider usage

## Benefits

1. **Audit Trail**: Complete history of all swap operations
2. **Analytics**: Understanding user behavior and swap patterns
3. **Debugging**: Track failed swaps and identify issues
4. **Reporting**: Generate swap reports and statistics
5. **Compliance**: Meet regulatory requirements with detailed transaction logging

