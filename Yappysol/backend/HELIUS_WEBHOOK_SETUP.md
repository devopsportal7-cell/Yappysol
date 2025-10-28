# Helius Webhook Setup for Yappy

## Overview

Yappy now uses Helius webhooks to detect external transactions (deposits and withdrawals) in real-time, without API polling.

## How It Works

### 1. Automatic Setup
- ✅ When app starts → Subscribes ALL existing wallets to Helius webhook
- ✅ When new wallet created → Automatically added to webhook
- ✅ No manual configuration required

### 2. Transaction Detection
```
Transaction on Solana →
Helius detects it →
Helius sends HTTP POST to /api/webhooks/helius →
Your server stores transaction in database
```

### 3. What Gets Tracked
- ✅ Incoming SOL transfers (deposits)
- ✅ Outgoing SOL transfers (withdrawals)
- ✅ Incoming SPL tokens (USDC, USDT, BONK, etc.)
- ✅ Outgoing SPL tokens

## Environment Variables

Add to your `.env` or Doppler:

```bash
# Required
HELIUS_API_KEY=your_helius_api_key

# Optional (auto-detected from Render)
HELIUS_WEBHOOK_URL=https://yappysol.onrender.com/api/webhooks/helius
```

## How to Setup in Helius Dashboard (Optional)

If automatic setup fails, you can manually create the webhook:

1. Go to [Helius Dashboard](https://dashboard.helius.dev)
2. Click "Webhooks" → "Create Webhook"
3. Configure:
   - **URL**: `https://yappysol.onrender.com/api/webhooks/helius`
   - **Transaction Type**: Enhanced
   - **Transaction Types**: Any
   - **Account Addresses**: (Leave empty - we add them programmatically)
4. Save webhook

## Testing the Webhook

### 1. Test Endpoint
```bash
curl -X POST https://yappysol.onrender.com/api/webhooks/helius \
  -H "Content-Type: application/json" \
  -d '{"type": "test"}'
```

Expected response:
```json
{
  "success": true,
  "processed": 0,
  "message": "Webhook processed successfully"
}
```

### 2. Trigger Test Transaction
Send SOL to one of your monitored wallets and check the logs for:
```
[WEBHOOK] Helius webhook received
[WEBHOOK] Processing account
[WEBHOOK] Native SOL transfer processed
[EXTERNAL_TX] Stored webhook transaction
```

## Database

Transactions are stored in the `external_transactions` table:
- `signature` - Transaction signature
- `sender` - Sender wallet address
- `recipient` - Recipient wallet address
- `amount` - Transaction amount
- `token_symbol` - SOL, USDC, USDT, etc.
- `type` - 'SOL' or 'SPL'
- `block_time` - Timestamp

## API Endpoints

### Activity Feed
`GET /api/activity` - Returns all transactions (launches, swaps, deposits, withdrawals)

The activity feed now includes:
- Token launches
- Swaps
- **External deposits** (via webhook)
- **External withdrawals** (via webhook)

## Troubleshooting

### Webhook Not Receiving Data

Check logs for:
```
[HELIUS_WEBHOOK] Error initializing webhook
```

Possible causes:
1. `HELIUS_API_KEY` not set
2. Webhook URL not accessible
3. Helius API rate limit

### Transactions Not Being Stored

Check logs for:
```
[WEBHOOK] Error processing account event
```

Verify:
1. Webhook is receiving data
2. Database connection working
3. `external_transactions` table exists

## Migration from Old System

The old system used API polling which was unreliable. The new system:
- ✅ No API rate limits
- ✅ Faster (real-time)
- ✅ More reliable
- ✅ Tracks both deposits AND withdrawals

Old code is still in place but disabled. WebSocket still works for balance detection.
