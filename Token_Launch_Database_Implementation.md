# Token Launch Database Implementation

## Current State Analysis

### ❌ Missing Components:
1. **Database Table**: No `token_launches` table exists
2. **Persistent Storage**: Only in-memory sessions
3. **Launch History**: No tracking of completed launches
4. **Analytics**: No success/failure metrics

### ✅ Existing Components:
1. **Multi-Step Flow**: Working chat-based token creation
2. **API Integration**: Pump.fun and Bonk.fun integration
3. **Transaction Handling**: Unsigned transaction generation
4. **Error Handling**: Basic error responses

## Recommended Implementation

### 1. Database Schema

Create a `token_launches` table in Supabase:

```sql
CREATE TABLE token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  
  -- Token Details
  token_name VARCHAR(100) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Social Links
  twitter_url TEXT,
  telegram_url TEXT,
  website_url TEXT,
  
  -- Launch Configuration
  pool_type VARCHAR(20) NOT NULL CHECK (pool_type IN ('pump', 'bonk')),
  launch_amount DECIMAL(20, 9) NOT NULL,
  
  -- Transaction Details
  mint_address VARCHAR(44),
  transaction_signature VARCHAR(88),
  unsigned_transaction TEXT,
  
  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_token_launches_user_id ON token_launches(user_id);
CREATE INDEX idx_token_launches_status ON token_launches(status);
CREATE INDEX idx_token_launches_created_at ON token_launches(created_at DESC);
CREATE INDEX idx_token_launches_mint_address ON token_launches(mint_address) WHERE mint_address IS NOT NULL;
```

### 2. Backend Model

Create `TokenLaunchSupabase.ts`:

```typescript
import { v4 as uuidv4 } from 'uuid';
import { supabase, TABLES } from '../lib/supabase';

export interface TokenLaunch {
  id: string;
  user_id: string;
  session_id?: string;
  
  // Token Details
  token_name: string;
  token_symbol: string;
  description?: string;
  image_url?: string;
  
  // Social Links
  twitter_url?: string;
  telegram_url?: string;
  website_url?: string;
  
  // Launch Configuration
  pool_type: 'pump' | 'bonk';
  launch_amount: number;
  
  // Transaction Details
  mint_address?: string;
  transaction_signature?: string;
  unsigned_transaction?: string;
  
  // Status Tracking
  status: 'draft' | 'pending' | 'completed' | 'failed' | 'cancelled';
  error_message?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface CreateTokenLaunchData {
  userId: string;
  sessionId?: string;
  tokenName: string;
  tokenSymbol: string;
  description?: string;
  imageUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  poolType: 'pump' | 'bonk';
  launchAmount: number;
}

export interface UpdateTokenLaunchData {
  description?: string;
  imageUrl?: string;
  twitterUrl?: string;
  telegramUrl?: string;
  websiteUrl?: string;
  launchAmount?: number;
  mintAddress?: string;
  transactionSignature?: string;
  unsignedTransaction?: string;
  status?: 'draft' | 'pending' | 'completed' | 'failed' | 'cancelled';
  errorMessage?: string;
}

export class TokenLaunchModel {
  static async createLaunch(data: CreateTokenLaunchData): Promise<TokenLaunch> {
    const id = uuidv4();
    const launch: TokenLaunch = {
      id,
      user_id: data.userId,
      session_id: data.sessionId,
      token_name: data.tokenName,
      token_symbol: data.tokenSymbol,
      description: data.description,
      image_url: data.imageUrl,
      twitter_url: data.twitterUrl,
      telegram_url: data.telegramUrl,
      website_url: data.websiteUrl,
      pool_type: data.poolType,
      launch_amount: data.launchAmount,
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data: createdLaunch, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .insert([launch])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create token launch: ${error.message}`);
    }

    return createdLaunch;
  }

  static async findByUserId(userId: string): Promise<TokenLaunch[]> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find token launches: ${error.message}`);
    }

    return data || [];
  }

  static async findById(id: string): Promise<TokenLaunch | null> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to find token launch: ${error.message}`);
    }

    return data;
  }

  static async updateLaunch(id: string, updates: UpdateTokenLaunchData): Promise<TokenLaunch | null> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
      ...(updates.status === 'completed' && { completed_at: new Date().toISOString() })
    };

    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update token launch: ${error.message}`);
    }

    return data;
  }

  static async deleteLaunch(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete token launch: ${error.message}`);
    }

    return true;
  }

  static async getLaunchStats(userId: string): Promise<{
    total: number;
    completed: number;
    failed: number;
    pending: number;
  }> {
    const { data, error } = await supabase
      .from(TABLES.TOKEN_LAUNCHES)
      .select('status')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to get launch stats: ${error.message}`);
    }

    const stats = {
      total: data.length,
      completed: data.filter(l => l.status === 'completed').length,
      failed: data.filter(l => l.status === 'failed').length,
      pending: data.filter(l => l.status === 'pending').length
    };

    return stats;
  }
}
```

### 3. API Endpoints

Add to `routes/chat.ts`:

```typescript
// Token launch management endpoints
router.get('/launches', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launches = await TokenLaunchModel.findByUserId(userId);
    res.json({ launches });
  } catch (error) {
    console.error('[CHAT] Error fetching launches:', error);
    res.status(500).json({ error: 'Failed to fetch token launches' });
  }
}));

router.get('/launches/:id', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launch = await TokenLaunchModel.findById(req.params.id);
    if (!launch || launch.user_id !== userId) {
      return res.status(404).json({ error: 'Token launch not found' });
    }
    res.json({ launch });
  } catch (error) {
    console.error('[CHAT] Error fetching launch:', error);
    res.status(500).json({ error: 'Failed to fetch token launch' });
  }
}));

router.get('/launches/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const stats = await TokenLaunchModel.getLaunchStats(userId);
    res.json({ stats });
  } catch (error) {
    console.error('[CHAT] Error fetching launch stats:', error);
    res.status(500).json({ error: 'Failed to fetch launch statistics' });
  }
}));
```

### 4. Updated TokenCreationService

Modify the service to use database persistence:

```typescript
// In TokenCreationService.createToken method
async createToken(params: any) {
  // ... existing validation ...

  // Create database record
  const launchRecord = await TokenLaunchModel.createLaunch({
    userId: params.userId,
    sessionId: params.sessionId,
    tokenName: params.name,
    tokenSymbol: params.symbol,
    description: params.description,
    imageUrl: params.imageUrl,
    twitterUrl: params.twitter,
    telegramUrl: params.telegram,
    websiteUrl: params.website,
    poolType: params.pool,
    launchAmount: params.amount
  });

  try {
    // ... existing token creation logic ...

    // Update record with success
    await TokenLaunchModel.updateLaunch(launchRecord.id, {
      mintAddress: result.mint,
      transactionSignature: result.signature,
      unsignedTransaction: result.unsignedTransaction,
      status: 'completed'
    });

    return {
      ...result,
      launchId: launchRecord.id
    };
  } catch (error) {
    // Update record with failure
    await TokenLaunchModel.updateLaunch(launchRecord.id, {
      status: 'failed',
      errorMessage: error.message
    });
    throw error;
  }
}
```

### 5. Frontend Integration

Add launch history to the frontend:

```typescript
// API calls
const getTokenLaunches = async () => {
  const response = await fetch('/api/chat/launches', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  return response.json();
};

const getLaunchStats = async () => {
  const response = await fetch('/api/chat/launches/stats', {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  return response.json();
};

// UI Component
const TokenLaunchHistory = () => {
  const [launches, setLaunches] = useState([]);
  const [stats, setStats] = useState(null);

  useEffect(() => {
    Promise.all([getTokenLaunches(), getLaunchStats()])
      .then(([launchesData, statsData]) => {
        setLaunches(launchesData.launches);
        setStats(statsData.stats);
      });
  }, []);

  return (
    <div className="launch-history">
      <div className="stats">
        <div>Total: {stats?.total}</div>
        <div>Completed: {stats?.completed}</div>
        <div>Failed: {stats?.failed}</div>
      </div>
      
      <div className="launches-list">
        {launches.map(launch => (
          <div key={launch.id} className="launch-item">
            <div className="token-info">
              <h3>{launch.token_name} ({launch.token_symbol})</h3>
              <p>{launch.description}</p>
            </div>
            <div className="launch-status">
              <span className={`status ${launch.status}`}>
                {launch.status}
              </span>
              {launch.mint_address && (
                <a href={`https://solscan.io/token/${launch.mint_address}`}>
                  View Token
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
```

## Implementation Priority

1. **High**: Create database table and model
2. **High**: Update TokenCreationService to use database
3. **Medium**: Add API endpoints for launch management
4. **Medium**: Add frontend launch history component
5. **Low**: Add analytics and reporting features

This implementation will provide:
- ✅ **Persistent Storage**: All launches saved to database
- ✅ **Launch History**: Users can see their previous launches
- ✅ **Status Tracking**: Draft → Pending → Completed/Failed
- ✅ **Analytics**: Success rates and statistics
- ✅ **Error Tracking**: Failed launches with error messages
- ✅ **Transaction Links**: Direct links to view tokens on Solscan

