# Activity Feed Data Sources - Complete Breakdown

## 📊 Endpoint: `GET /api/activity`

Returns aggregated activity feed combining data from **3 database tables**:

```json
{
  "activities": [...],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

## 🗄️ Data Sources

### 1. **Token Launches** 📈
**Table:** `token_launches`  
**Query Method:** `TokenLaunchModel.findByUserId(userId, limit)`  
**Filters:** `user_id = ? AND limit`

**Raw Fields:**
```typescript
{
  id: UUID,
  user_id: UUID,
  token_name: string,
  token_symbol: string,
  pool_type: 'pump' | 'bonk',
  transaction_signature: string,
  status: 'completed' | 'failed' | 'pending',
  launch_amount: number,
  market_cap_usd: number,
  created_at: timestamp,
  completed_at: timestamp
}
```

**Formatted Output:**
```json
{
  "id": "uuid",
  "type": "launch",
  "title": "Created Bonky Inu (BONKY)",
  "description": "Launched token on Pump.fun",
  "timestamp": "2025-01-01T12:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature_here",
    "solscanUrl": "https://solscan.io/tx/...",
    "tokenName": "Bonky Inu",
    "tokenSymbol": "BONKY",
    "pool": "pump",
    "amount": 5.0,
    "valueUsd": 1000
  }
}
```

---

### 2. **Swaps** 🔄
**Table:** `swap_transactions`  
**Query Method:** `swapTrackingService.getUserSwapHistory(userId, limit, 0)`  
**Filters:** `user_id = ? LIMIT ?`

**Raw Fields:**
```typescript
{
  id: UUID,
  user_id: UUID,
  wallet_id: UUID,
  from_token_mint: string,
  from_token_symbol: string,
  from_token_amount: number,
  to_token_mint: string,
  to_token_symbol: string,
  to_token_amount: number,
  transaction_signature: string,
  execution_provider: 'solana-tracker' | 'jupiter' | 'pumpportal',
  status: 'confirmed' | 'pending' | 'failed',
  solscan_url: string,
  slippage_bps: number,
  created_at: timestamp
}
```

**Formatted Output:**
```json
{
  "id": "uuid",
  "type": "swap",
  "title": "Swapped 0.01 SOL → USDT",
  "description": "Executed via solana-tracker",
  "timestamp": "2025-01-01T12:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature_here",
    "solscanUrl": "https://solscan.io/tx/...",
    "fromToken": "SOL",
    "toToken": "USDT",
    "amount": 0.01,
    "valueUsd": 2.00,
    "executionProvider": "solana-tracker"
  }
}
```

---

### 3. **External Transactions** (Deposits/Withdrawals) 💸
**Table:** `external_transactions`  
**Query Method:** Direct Supabase queries  
**Filters:** 
- **Deposits:** `recipient IN (user_wallet_addresses)`  
- **Withdrawals:** `sender IN (user_wallet_addresses)`

**Raw Fields:**
```typescript
{
  id: UUID,
  user_id: UUID,
  signature: string,
  block_time: number (unix timestamp),
  amount: number,
  token_mint: string,
  token_symbol: string,
  token_name: string,
  sender: string,
  recipient: string,
  type: 'SOL' | 'SPL',
  value_usd: number,
  solscan_url: string,
  created_at: timestamp,
  updated_at: timestamp
}
```

**Formatted Output for DEPOSIT:**
```json
{
  "id": "uuid",
  "type": "external",
  "title": "Received 5 SOL",
  "description": "External deposit",
  "timestamp": "2025-01-01T12:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature_here",
    "solscanUrl": "https://solscan.io/tx/...",
    "tokenSymbol": "SOL",
    "amount": 5.0,
    "valueUsd": 970.0,
    "sender": "external_wallet_address",
    "recipient": "user_wallet_address"
  }
}
```

**Formatted Output for WITHDRAWAL:**
```json
{
  "id": "uuid",
  "type": "external",
  "title": "Sent 2 SOL",
  "description": "Sent to external address",
  "timestamp": "2025-01-01T12:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "tx_signature_here",
    "solscanUrl": "https://solscan.io/tx/...",
    "tokenSymbol": "SOL",
    "amount": 2.0,
    "valueUsd": 388.0,
    "sender": "user_wallet_address",
    "recipient": "external_wallet_address"
  }
}
```

---

## 📋 Activity Types

| Type | Source | Description |
|------|--------|-------------|
| `launch` | `token_launches` | User created a token on Pump.fun or Bonk |
| `swap` | `swap_transactions` | User swapped tokens via various providers |
| `external` | `external_transactions` | User received or sent funds to/from external wallets |
| `transfer` | *(Not yet implemented)* | Internal transfers between user's own wallets |

---

## 🔄 Data Processing Flow

```mermaid
1. Request comes in: GET /api/activity?limit=50&offset=0
2. Authenticate user (authMiddleware)
3. Fetch in parallel (Promise.all):
   ├─ getLaunches(userId, limit) 
   │  └─ TokenLaunchModel.findByUserId()
   │     └─ FROM token_launches WHERE user_id = ?
   │
   ├─ getSwaps(userId, limit)
   │  └─ swapTrackingService.getUserSwapHistory()
   │     └─ FROM swap_transactions WHERE user_id = ?
   │
   └─ getExternalTransactions(userId, limit)
      ├─ Get user wallets from wallets table
      ├─ Query deposits: FROM external_transactions 
      │  WHERE recipient IN (user_wallets)
      └─ Query withdrawals: FROM external_transactions
         WHERE sender IN (user_wallets)

4. Format each type with formatLaunchActivity(), 
   formatSwapActivity(), formatExternalActivity()

5. Combine all activities into single array

6. Sort by timestamp (newest first)

7. Apply pagination (slice with limit/offset)

8. Return JSON response
```

---

## 📤 Response Format

### Single Activity Item Structure:
```typescript
interface ActivityItem {
  id: string;                                    // UUID from database
  type: 'launch' | 'swap' | 'transfer' | 'external';
  title: string;                                // Human-readable title
  description: string;                           // Short description
  timestamp: string;                             // ISO 8601 timestamp
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  metadata: {
    // Transaction details
    signature?: string;                          // Transaction signature
    solscanUrl?: string;                         // Solscan link
    solscan_url?: string;                        // Alternative field name
    
    // Token details
    tokenSymbol?: string;
    tokenName?: string;
    token_symbol?: string;
    token_name?: string;
    
    // Transfer details
    fromToken?: string;
    toToken?: string;
    amount?: number;
    valueUsd?: number;
    
    // Execution details
    pool?: string;                               // pump/bonk
    executionProvider?: string;                  // solana-tracker/jupiter/pumpportal
    
    // Transaction participants
    sender?: string;
    recipient?: string;
  };
}
```

### Complete Response:
```json
{
  "activities": [
    {
      "id": "abc-123",
      "type": "swap",
      "title": "Swapped 0.01 SOL → USDT",
      "description": "Executed via solana-tracker",
      "timestamp": "2025-01-28T02:27:49Z",
      "status": "confirmed",
      "metadata": {
        "signature": "NZ5mtheB7bx43LtaxFcF6FbRvzZYMNStmYxjLEAhfpSQ2PbVohy3u89jAPpp74CvfB3JQgNX2v6mZHUn73QZ8nh",
        "solscanUrl": "https://solscan.io/tx/NZ5mtheB7bx43LtaxFcF6FbRvzZYMNStmYxjLEAhfpSQ2PbVohy3u89jAPpp74CvfB3JQgNX2v6mZHUn73QZ8nh",
        "fromToken": "SOL",
        "toToken": "USDT",
        "amount": 0.01,
        "valueUsd": 2.0,
        "executionProvider": "solana-tracker"
      }
    },
    {
      "id": "def-456",
      "type": "external",
      "title": "Received 5 SOL",
      "description": "External deposit",
      "timestamp": "2025-01-28T01:00:00Z",
      "status": "confirmed",
      "metadata": {
        "signature": "signature_here",
        "solscanUrl": "https://solscan.io/tx/signature_here",
        "tokenSymbol": "SOL",
        "amount": 5.0,
        "valueUsd": 970.0,
        "sender": "external_wallet",
        "recipient": "user_wallet"
      }
    }
    // ... more activities
  ],
  "total": 150,          // Total activities across all types
  "limit": 50,          // Requested limit
  "offset": 0           // Requested offset
}
```

---

## 🔍 Query Filters Applied

### Launches:
```sql
SELECT * FROM token_launches 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 50
```

### Swaps:
```sql
SELECT * FROM swap_transactions 
WHERE user_id = 'user-uuid' 
ORDER BY created_at DESC 
LIMIT 50 OFFSET 0
```

### External Transactions (Deposits):
```sql
SELECT * FROM external_transactions 
WHERE recipient IN (
  SELECT public_key FROM wallets 
  WHERE user_id = 'user-uuid' AND is_active = true
)
ORDER BY block_time DESC 
LIMIT 50
```

### External Transactions (Withdrawals):
```sql
SELECT * FROM external_transactions 
WHERE sender IN (
  SELECT public_key FROM wallets 
  WHERE user_id = 'user-uuid' AND is_active = true
)
ORDER BY block_time DESC 
LIMIT 50
```

---

## ⚠️ Important Notes

1. **No External APIs**: All data comes from database tables, no external API calls
2. **Real-time**: Depends on database being updated by swap/launch services
3. **Pagination**: Supports `limit` and `offset` query parameters
4. **Sorted**: Activities are sorted by timestamp (newest first) after combining all sources
5. **Timestamps**: Different formats:
   - `token_launches.created_at` → ISO timestamp
   - `swap_transactions.created_at` → ISO timestamp  
   - `external_transactions.block_time` → Unix timestamp (converted to ISO)

6. **Missing Data**: If any source fails, that activity type is skipped (returns empty array)

---

## 🐛 Current Issue

The frontend is calling `https://yappy-solana-yap-machine.lovable.app/api/activity` instead of the backend URL `https://yappysol.onrender.com/api/activity`, which causes the HTML response error.

