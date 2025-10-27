# Activity Feed Implementation Prompt for Lovable

## Overview
We need to implement an **Activity Feed** UI component that displays a unified timeline of user activities including token launches, swaps, deposits, and withdrawals.

## API Endpoint

### Endpoint
```
GET /api/activity?limit=50&offset=0
```

### Headers
```
Authorization: Bearer {token}
```

### Response Format
```json
{
  "activities": [
    {
      "id": "uuid",
      "type": "launch",
      "title": "Created MyToken (MTK)",
      "description": "Launched token on Pump.fun",
      "timestamp": "2025-01-27T12:00:00Z",
      "status": "confirmed",
      "metadata": {
        "signature": "5uJh...",
        "solscanUrl": "https://solscan.io/tx/5uJh...",
        "tokenName": "MyAwesomeToken",
        "tokenSymbol": "MAT",
        "pool": "pump",
        "amount": 1.0,
        "valueUsd": 5000,
        "fromToken": "SOL",
        "toToken": "USDC",
        "executionProvider": "jupiter",
        "sender": "wallet_address",
        "recipient": "wallet_address"
      }
    }
  ],
  "total": 100,
  "limit": 50,
  "offset": 0
}
```

## Activity Types

### 1. Launch (type: "launch") 🚀
- **Title:** "Created {tokenName} ({tokenSymbol})"
- **Description:** "Launched token on Pump.fun" or "Bonk"
- **Metadata:** tokenName, tokenSymbol, pool, amount, valueUsd
- **Status:** pending | confirmed | failed

### 2. Swap (type: "swap") 🔄
- **Title:** "Swapped {amount} {fromToken} → {toToken}"
- **Description:** "Executed via {executionProvider}"
- **Metadata:** fromToken, toToken, amount, executionProvider
- **Status:** pending | confirmed | failed | reverted

### 3. External (type: "external") ⬇️/⬆️
- **Title:** "Received {amount} {tokenSymbol}" or "Sent {amount} {tokenSymbol}"
- **Description:** "External deposit" or "Sent to external address"
- **Metadata:** tokenSymbol, amount, valueUsd, sender, recipient
- **Status:** confirmed

## UI Requirements

### Component Structure
```
ActivityFeed
├── ActivityHeader (showing total count)
├── ActivityList
│   ├── ActivityItem (launch)
│   ├── ActivityItem (swap)
│   ├── ActivityItem (external - deposit)
│   └── ActivityItem (external - withdrawal)
└── LoadMore button (pagination)
```

### ActivityItem Design
Each activity should display:

1. **Icon** based on type:
   - 🚀 for launches
   - 🔄 for swaps
   - ⬇️ for deposits
   - ⬆️ for withdrawals

2. **Title** (bold, main content)

3. **Description** (secondary text, muted color)

4. **Status Badge** with color coding:
   - 🟢 Green for "confirmed"
   - 🟡 Yellow for "pending"
   - 🔴 Red for "failed"

5. **Timestamp** (relative time: "2 hours ago")

6. **Metadata** (optional, collapsible):
   - Transaction signature
   - Amount and value in USD
   - Solscan link
   - Token details

7. **Actions**:
   - "View on Solscan" link (opens in new tab)
   - Copy transaction signature

## Implementation Steps

### Step 1: Create ActivityFeed Component

```tsx
// components/ActivityFeed.tsx
import { useEffect, useState } from 'react';
import { ActivityItem } from '../types/activity';

interface ActivityFeedProps {
  limit?: number;
}

export const ActivityFeed = ({ limit = 50 }: ActivityFeedProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchActivities();
  }, [offset]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/activity?limit=${limit}&offset=${offset}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      const data = await response.json();
      
      if (offset === 0) {
        setActivities(data.activities);
      } else {
        setActivities([...activities, ...data.activities]);
      }
      
      setHasMore(data.activities.length === limit);
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setOffset(offset + limit);
  };

  if (loading && activities.length === 0) {
    return <div>Loading activities...</div>;
  }

  return (
    <div className="activity-feed">
      <div className="activity-header">
        <h2>Recent Activity</h2>
        <span className="activity-count">{activities.length} activities</span>
      </div>
      
      <div className="activity-list">
        {activities.map(activity => (
          <ActivityItem key={activity.id} activity={activity} />
        ))}
      </div>
      
      {hasMore && (
        <button onClick={loadMore} disabled={loading}>
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
};
```

### Step 2: Create ActivityItem Component

```tsx
// components/ActivityItem.tsx
import { ActivityItem as ActivityItemType } from '../types/activity';

interface Props {
  activity: ActivityItemType;
}

export const ActivityItem = ({ activity }: Props) => {
  const getIcon = () => {
    switch (activity.type) {
      case 'launch':
        return '🚀';
      case 'swap':
        return '🔄';
      case 'external':
        return activity.title.includes('Received') ? '⬇️' : '⬆️';
      default:
        return '📋';
    }
  };

  const getStatusColor = () => {
    switch (activity.status) {
      case 'confirmed':
        return 'text-green-600 bg-green-50';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50';
      case 'failed':
      case 'reverted':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <div className="activity-item border-b border-gray-200 py-4 hover:bg-gray-50 transition-colors">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="text-3xl">{getIcon()}</div>
        
        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{activity.title}</h3>
          <p className="text-sm text-gray-600 mt-1">{activity.description}</p>
          
          {/* Metadata */}
          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
            <span className={`inline-flex items-center px-2 py-1 rounded-full font-medium ${getStatusColor()}`}>
              {activity.status.toUpperCase()}
            </span>
            <span className="text-gray-500">
              {formatDate(activity.timestamp)}
            </span>
            {activity.metadata.signature && (
              <a
                href={activity.metadata.solscanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                View on Solscan →
              </a>
            )}
          </div>
          
          {/* Amount Display (if available) */}
          {activity.metadata.amount && (
            <div className="mt-2 text-sm text-gray-700">
              <span className="font-medium">{activity.metadata.amount}</span>
              <span className="text-gray-500 ml-2">{activity.metadata.fromToken || activity.metadata.tokenSymbol}</span>
              {activity.metadata.valueUsd && (
                <span className="text-gray-500 ml-2">
                  (${activity.metadata.valueUsd.toFixed(2)})
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
```

### Step 3: Create Type Definitions

```typescript
// types/activity.ts
export interface ActivityItem {
  id: string;
  type: 'launch' | 'swap' | 'transfer' | 'external';
  title: string;
  description: string;
  timestamp: string;
  status: 'pending' | 'confirmed' | 'failed' | 'reverted';
  metadata: {
    signature?: string;
    solscanUrl?: string;
    fromToken?: string;
    toToken?: string;
    amount?: number;
    valueUsd?: number;
    tokenName?: string;
    tokenSymbol?: string;
    pool?: string;
    executionProvider?: string;
    sender?: string;
    recipient?: string;
  };
}
```

### Step 4: Styling

Use Tailwind CSS with these classes:

```css
/* Main container */
.activity-feed {
  @apply max-w-4xl mx-auto p-6;
}

/* Header */
.activity-header {
  @apply flex justify-between items-center mb-6;
}

/* List container */
.activity-list {
  @apply space-y-0;
}

/* Individual item */
.activity-item {
  @apply px-4 py-4 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0;
}

/* Status badges */
.status-confirmed {
  @apply text-green-600 bg-green-50 px-2 py-1 rounded-full text-xs font-medium;
}

.status-pending {
  @apply text-yellow-600 bg-yellow-50 px-2 py-1 rounded-full text-xs font-medium;
}

.status-failed {
  @apply text-red-600 bg-red-50 px-2 py-1 rounded-full text-xs font-medium;
}
```

## Features to Implement

1. ✅ Display activity feed with all activity types
2. ✅ Show status badges with color coding
3. ✅ Display relative timestamps ("2h ago")
4. ✅ Link to Solscan for transaction details
5. ✅ Pagination with "Load More" button
6. ✅ Empty state when no activities
7. ✅ Loading state while fetching
8. ✅ Error handling for API failures
9. ✅ Responsive design (mobile-friendly)
10. ✅ Optional: Filter by activity type
11. ✅ Optional: Sort by date, type, status
12. ✅ Optional: Search activities

## Example Use Cases

1. **User launches a token** → Shows in feed as "🚀 Created MyToken (MTK)"
2. **User swaps SOL for USDC** → Shows as "🔄 Swapped 1.5 SOL → 300 USDC"
3. **User receives external deposit** → Shows as "⬇️ Received 5 SOL"
4. **User withdraws funds** → Shows as "⬆️ Sent 2 SOL"

## Integration Points

- Add to Dashboard page
- Add to User Profile page
- Add as a sidebar widget
- Add as a standalone "Activity" page

## Testing

Test with these scenarios:
1. Empty state (no activities)
2. Loading state (while fetching)
3. Multiple activity types mixed together
4. Pagination (load more activities)
5. Failed API call (error state)
6. Different status badges (confirmed, pending, failed)

## Acceptance Criteria

✅ Activity feed displays all user activities
✅ Activities are sorted by timestamp (newest first)
✅ Each activity shows correct icon, title, description
✅ Status badges are color-coded correctly
✅ Solscan links work properly
✅ Pagination works for loading more activities
✅ Loading and error states are handled
✅ Responsive on mobile devices
✅ Matches existing design system

## Notes

- The API endpoint is already implemented in the backend
- Activities include token launches, swaps, deposits, and withdrawals
- Each activity has metadata like transaction signatures, amounts, and Solscan URLs
- Use relative timestamps for better UX ("2h ago" vs "Jan 27, 2025")
- Include a "Copy Signature" button for transactions
- Add tooltips for status explanations
- Consider adding filters for activity type and date range

