# Activity Feed Implementation

## Overview
The activity feed displays a unified timeline of user actions including token launches, swaps, transfers, and external transactions.

## API Endpoint

### `GET /api/activity`

Returns a unified activity feed combining:
- Token launches (from `token_launches` table)
- Swaps (from `swap_transactions` table)
- External transactions (from `external_transactions` table)

**Authentication:** Required (middleware: `authMiddleware`)

**Query Parameters:**
- `limit` (optional, default: 50) - Number of activities to return
- `offset` (optional, default: 0) - Pagination offset

**Response:**
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "launch" | "swap" | "external",
      "title": "Activity title",
      "description": "Activity description",
      "timestamp": "2025-01-27T12:00:00Z",
      "status": "confirmed" | "pending" | "failed",
      "metadata": {
        "signature": "tx_signature",
        "solscanUrl": "https://solscan.io/tx/...",
        "fromToken": "SOL",
        "toToken": "USDC",
        "amount": 1.5,
        "valueUsd": 300,
        "tokenName": "My Token",
        "tokenSymbol": "MTK",
        "pool": "pump",
        "executionProvider": "jupiter"
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

## Activity Types

### 1. Launch (`type: "launch"`)
Token creation/launch activity.

**Fields:**
- `title`: "Created TokenName (SYMBOL)"
- `description`: "Launched token on Pump.fun" or "Bonk"
- `status`: "pending" | "confirmed" | "failed"
- `metadata.tokenName`: Token name
- `metadata.tokenSymbol`: Token symbol
- `metadata.pool`: "pump" | "bonk"
- `metadata.amount`: Launch amount
- `metadata.valueUsd`: Market cap USD

### 2. Swap (`type: "swap"`)
Token swap activity.

**Fields:**
- `title`: "Swapped 1.5 SOL → 300 USDC"
- `description`: "Executed via jupiter"
- `status`: "pending" | "confirmed" | "failed" | "reverted"
- `metadata.fromToken`: From token symbol
- `metadata.toToken`: To token symbol
- `metadata.amount`: Swap amount
- `metadata.valueUsd`: USD value
- `metadata.executionProvider`: "pumpportal" | "jupiter"

### 3. External (`type: "external"`)
External deposit/withdrawal.

**Fields:**
- `title`: "Received 5 SOL" or "Sent 5 SOL"
- `description`: "External deposit" or "Sent to external address"
- `status`: "confirmed"
- `metadata.tokenSymbol`: Token symbol
- `metadata.amount`: Transaction amount
- `metadata.valueUsd`: USD value

## Frontend Implementation

### Example Usage

```typescript
// Fetch activity feed
const fetchActivityFeed = async (limit = 50, offset = 0) => {
  try {
    const response = await fetch(
      `https://api.yappysol.com/api/activity?limit=${limit}&offset=${offset}`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    const data = await response.json();
    return data.activities;
  } catch (error) {
    console.error('Error fetching activity feed:', error);
    return [];
  }
};

// Usage in component
const ActivityFeed = () => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      const data = await fetchActivityFeed(LIMIT, offset);
      setActivities(data);
      setLoading(false);
    };
    loadActivities();
  }, [offset]);

  const loadMore = () => {
    setOffset(offset + LIMIT);
  };

  return (
    <div className="activity-feed">
      {activities.map(activity => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
      <button onClick={loadMore}>Load More</button>
    </div>
  );
};
```

### Activity Item Component

```typescript
import { ActivityItem } from '../types/activity';

const ActivityItem = ({ activity }: { activity: ActivityItem }) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'launch':
        return '🚀';
      case 'swap':
        return '🔄';
      case 'external':
        return activity.title.includes('Received') ? '⬇️' : '⬆️';
    }
  };

  const getStatusColor = () => {
    switch (activity.status) {
      case 'confirmed':
        return 'text-green-600';
      case 'pending':
        return 'text-yellow-600';
      case 'failed':
        return 'text-red-600';
    }
  };

  return (
    <div className="activity-item border-b py-4">
      <div className="flex items-start gap-3">
        <span className="text-2xl">{getIcon()}</span>
        <div className="flex-1">
          <h3 className="font-semibold">{activity.title}</h3>
          <p className="text-sm text-gray-600">{activity.description}</p>
          <div className="flex items-center gap-2 mt-2">
            <span className={`text-xs font-medium ${getStatusColor()}`}>
              {activity.status.toUpperCase()}
            </span>
            <span className="text-xs text-gray-500">
              {formatDate(activity.timestamp)}
            </span>
            {activity.metadata.solscanUrl && (
              <a
                href={activity.metadata.solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline"
              >
                View on Solscan →
              </a>
            )}
          </div>
        </div>
        {activity.metadata.amount && (
          <div className="text-right">
            <div className="text-lg font-bold">
              {activity.metadata.amount} {activity.metadata.fromToken}
            </div>
            {activity.metadata.valueUsd && (
              <div className="text-sm text-gray-600">
                ${activity.metadata.valueUsd.toFixed(2)}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const formatDate = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};
```

## Activity Type Details

### Launch Example
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174000",
  "type": "launch",
  "title": "Created MyAwesomeToken (MAT)",
  "description": "Launched token on Pump.fun",
  "timestamp": "2025-01-27T10:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "5uJh...",
    "solscanUrl": "https://solscan.io/tx/5uJh...",
    "tokenName": "MyAwesomeToken",
    "tokenSymbol": "MAT",
    "pool": "pump",
    "amount": 1.0,
    "valueUsd": 5000
  }
}
```

### Swap Example
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174001",
  "type": "swap",
  "title": "Swapped 1.5 SOL → 300 USDC",
  "description": "Executed via jupiter",
  "timestamp": "2025-01-27T11:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "4xKp...",
    "solscanUrl": "https://solscan.io/tx/4xKp...",
    "fromToken": "SOL",
    "toToken": "USDC",
    "amount": 1.5,
    "valueUsd": 300,
    "executionProvider": "jupiter"
  }
}
```

### External Example
```json
{
  "id": "123e4567-e89b-12d3-a456-426614174002",
  "type": "external",
  "title": "Received 5 SOL",
  "description": "External deposit",
  "timestamp": "2025-01-27T12:00:00Z",
  "status": "confirmed",
  "metadata": {
    "signature": "7mNz...",
    "solscanUrl": "https://solscan.io/tx/7mNz...",
    "tokenSymbol": "SOL",
    "amount": 5,
    "valueUsd": 970
  }
}
```

## Database Tables Used

1. **`token_launches`** - Token creation tracking
2. **`swap_transactions`** - Swap tracking (needs schema creation)
3. **`external_transactions`** - External transaction tracking

## Next Steps

1. Run database schema for `swap_transactions` table
2. Implement swap tracking in `TokenSwapService`
3. Add activity feed UI to frontend
4. Add real-time updates via WebSocket for new activities

## Testing

Test the endpoint:
```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  https://api.yappysol.com/api/activity?limit=10
```

Expected response: Array of activity items sorted by timestamp (newest first).

