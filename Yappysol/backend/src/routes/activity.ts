import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { TokenLaunchModel } from '../models/TokenLaunchSupabase';
import { swapTrackingService } from '../services/SwapTrackingService';
import { supabase } from '../lib/supabase';
import { ExternalTransactionService } from '../services/ExternalTransactionService';

const router = Router();

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

/**
 * GET /api/activity
 * Get unified activity feed for a user (launches, swaps, transfers, external transactions)
 */
router.get('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('[ACTIVITY] Request received', { 
    userId: req.user?.id,
    query: req.query 
  });

  const userId = req.user?.id;
  if (!userId) {
    console.error('[ACTIVITY] User not authenticated');
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    console.log('[ACTIVITY] Fetching activities', { userId, limit, offset });

    // Get user's wallet addresses for determining transaction direction
    const { data: wallets, error: walletsError } = await supabase
      .from('wallets')
      .select('public_key')
      .eq('user_id', userId)
      .eq('is_active', true);
    
    const userWalletAddresses = wallets && !walletsError ? wallets.map((w: any) => w.public_key) : [];
    console.log('[ACTIVITY] User wallet addresses for direction detection:', { count: userWalletAddresses.length });

    // Fetch all activity types in parallel with timeout protection
    const timeout = 10000; // 10 second timeout per operation
    
    const [launches, swaps, externalTxs] = await Promise.all([
      Promise.race([
        getLaunches(userId, limit),
        new Promise(resolve => setTimeout(() => { console.warn('[ACTIVITY] Launches timeout'); resolve([]); }, timeout))
      ]) as Promise<any[]>,
      Promise.race([
        getSwaps(userId, limit),
        new Promise(resolve => setTimeout(() => { console.warn('[ACTIVITY] Swaps timeout'); resolve([]); }, timeout))
      ]) as Promise<any[]>,
      Promise.race([
        getExternalTransactions(userId, limit),
        new Promise(resolve => setTimeout(() => { console.warn('[ACTIVITY] External transactions timeout'); resolve([]); }, timeout))
      ]) as Promise<any[]>
    ]);

    console.log('[ACTIVITY] Fetched data', { 
      launches: launches.length, 
      swaps: swaps.length, 
      externalTxs: externalTxs.length 
    });

    // Combine all activities and sort by timestamp
    const activities: ActivityItem[] = [
      ...launches.map(formatLaunchActivity),
      ...swaps.map(formatSwapActivity),
      ...externalTxs.map(tx => formatExternalActivity(tx, userWalletAddresses))
    ].filter(activity => {
      // Validate timestamp exists and is valid
      if (!activity.timestamp) {
        console.warn('[ACTIVITY] Activity missing timestamp:', activity.id);
        return false;
      }
      const ts = new Date(activity.timestamp).getTime();
      if (isNaN(ts)) {
        console.warn('[ACTIVITY] Invalid timestamp:', activity.id, activity.timestamp);
        return false;
      }
      return true;
    }).sort((a, b) => {
      // Sort by timestamp descending (newest first)
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();
      return timeB - timeA;
    });

    // Apply limit and offset
    const paginatedActivities = activities.slice(offset, offset + limit);

    console.log('[ACTIVITY] Returning activities', { 
      total: activities.length, 
      returned: paginatedActivities.length,
      oldestTimestamp: activities.length > 0 ? activities[activities.length - 1]?.timestamp : 'N/A',
      newestTimestamp: activities.length > 0 ? activities[0]?.timestamp : 'N/A',
      firstThreeIds: paginatedActivities.slice(0, 3).map(a => ({ id: a.id, type: a.type, timestamp: a.timestamp }))
    });

    // Set cache headers to prevent browser caching of activity data
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });

    res.json({
      activities: paginatedActivities,
      total: activities.length,
      limit,
      offset
    });
  } catch (error: any) {
    console.error('[ACTIVITY] Error fetching activity:', {
      error: error.message,
      stack: error.stack,
      userId
    });
    res.status(500).json({ error: 'Failed to fetch activity feed' });
  }
}));

/**
 * Get token launches for a user
 */
async function getLaunches(userId: string, limit: number) {
  try {
    const launches = await TokenLaunchModel.findByUserId(userId, limit);
    return launches || [];
  } catch (error) {
    console.error('[ACTIVITY] Error fetching launches:', error);
    return [];
  }
}

/**
 * Get swaps for a user
 */
async function getSwaps(userId: string, limit: number) {
  try {
    const swaps = await swapTrackingService.getUserSwapHistory(userId, limit, 0);
    return swaps || [];
  } catch (error) {
    console.error('[ACTIVITY] Error fetching swaps:', error);
    return [];
  }
}

/**
 * Get external transactions for a user (both deposits and withdrawals)
 */
async function getExternalTransactions(userId: string, limit: number) {
  try {
    // Get user's wallets
    const { data: wallets, error } = await supabase
      .from('wallets')
      .select('id, public_key')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !wallets || wallets.length === 0) {
      console.log('[ACTIVITY] No wallets found for user:', userId);
      return [];
    }

    const walletAddresses = wallets.map((w: any) => w.public_key);
    if (walletAddresses.length === 0) {
      console.log('[ACTIVITY] No wallet addresses to query');
      return [];
    }

    const allTransactions: any[] = [];

    // Get deposits (incoming transactions to user's wallets)
    try {
      // Use a query with timeout protection
      const depositsQuery = supabase
        .from('external_transactions')
        .select('*')
        .in('recipient', walletAddresses)
        .order('block_time', { ascending: false })
        .limit(limit);
      
      const { data: deposits, error: depositsError } = await Promise.race([
        depositsQuery,
        new Promise((resolve) => 
          setTimeout(() => {
            console.warn('[ACTIVITY] Deposits query timeout');
            resolve({ data: null, error: { message: 'Query timeout' } });
          }, 5000)
        )
      ]) as any;

      if (!depositsError && deposits) {
        console.log('[ACTIVITY] Fetched deposits:', { count: deposits.length });
        // Filter out dust transactions (< 0.00001 SOL or < 1e-8 for SPL tokens)
        const MIN_SIGNIFICANT_AMOUNT = 0.00001;
        const filteredDeposits = deposits.filter((tx: any) => {
          if (tx.type === 'SOL' && parseFloat(tx.amount) >= MIN_SIGNIFICANT_AMOUNT) {
            return true;
          }
          if (tx.type === 'SPL' && parseFloat(tx.amount) >= 1e-8) {
            return true;
          }
          return false;
        });
        console.log('[ACTIVITY] After filtering dust:', { 
          original: deposits.length, 
          filtered: filteredDeposits.length 
        });
        allTransactions.push(...filteredDeposits);
      } else {
        console.error('[ACTIVITY] Error fetching deposits:', depositsError);
      }
    } catch (error) {
      console.error('[ACTIVITY] Error fetching deposits:', error);
    }

    // Get withdrawals (outgoing transactions from user's wallets)
    try {
      const { data: withdrawals, error: withdrawalsError } = await Promise.race([
        supabase
          .from('external_transactions')
          .select('*')
          .in('sender', walletAddresses)
          .order('block_time', { ascending: false })
          .limit(limit),
        new Promise((resolve) => 
          setTimeout(() => {
            console.warn('[ACTIVITY] Withdrawals query timeout');
            resolve({ data: null, error: { message: 'Query timeout' } });
          }, 5000)
        )
      ]) as any;

      if (!withdrawalsError && withdrawals) {
        console.log('[ACTIVITY] Fetched withdrawals:', { count: withdrawals.length });
        // Filter out dust transactions (< 0.00001 SOL or < 1e-8 for SPL tokens)
        const MIN_SIGNIFICANT_AMOUNT = 0.00001;
        const filteredWithdrawals = withdrawals.filter((tx: any) => {
          if (tx.type === 'SOL' && parseFloat(tx.amount) >= MIN_SIGNIFICANT_AMOUNT) {
            return true;
          }
          if (tx.type === 'SPL' && parseFloat(tx.amount) >= 1e-8) {
            return true;
          }
          return false;
        });
        allTransactions.push(...filteredWithdrawals);
      } else {
        console.error('[ACTIVITY] Error fetching withdrawals:', withdrawalsError);
      }
    } catch (error) {
      console.error('[ACTIVITY] Error fetching withdrawals:', error);
    }

    return allTransactions;
  } catch (error) {
    console.error('[ACTIVITY] Error fetching external transactions:', error);
    return [];
  }
}

/**
 * Format token launch as activity item
 */
function formatLaunchActivity(launch: any): ActivityItem {
  // Use the most recent timestamp - prefer completed_at if available, otherwise created_at
  let timestamp = launch.completed_at || launch.created_at;
  if (launch.created_at && launch.completed_at) {
    // Use whichever is more recent
    const created = new Date(launch.created_at).getTime();
    const completed = new Date(launch.completed_at).getTime();
    timestamp = completed > created ? launch.completed_at : launch.created_at;
  }
  
  return {
    id: launch.id,
    type: 'launch',
    title: `Created ${launch.token_name} (${launch.token_symbol})`,
    description: `Launched token on ${launch.pool_type === 'pump' ? 'Pump.fun' : 'Bonk'}`,
    timestamp,
    status: launch.status === 'completed' ? 'confirmed' : 
            launch.status === 'failed' ? 'failed' : 'pending',
    metadata: {
      signature: launch.transaction_signature,
      solscanUrl: launch.transaction_signature ? 
        `https://solscan.io/tx/${launch.transaction_signature}` : 
        undefined,
      tokenName: launch.token_name,
      tokenSymbol: launch.token_symbol,
      pool: launch.pool_type,
      amount: launch.launch_amount,
      valueUsd: launch.market_cap_usd
    }
  };
}

/**
 * Format swap as activity item
 */
function formatSwapActivity(swap: any): ActivityItem {
  const fromSymbol = swap.from_token_symbol || swap.from_token_mint.slice(0, 8);
  const toSymbol = swap.to_token_symbol || swap.to_token_mint.slice(0, 8);

  return {
    id: swap.id,
    type: 'swap',
    title: `Swapped ${swap.from_token_amount} ${fromSymbol} → ${toSymbol}`,
    description: `Executed via ${swap.execution_provider}`,
    timestamp: swap.created_at,
    status: swap.status,
    metadata: {
      signature: swap.transaction_signature,
      solscanUrl: swap.solscan_url,
      fromToken: swap.from_token_symbol || swap.from_token_mint,
      toToken: swap.to_token_symbol || swap.to_token_mint,
      amount: swap.from_token_amount,
      valueUsd: swap.from_token_amount * (swap.to_token_amount / swap.from_token_amount || 0),
      executionProvider: swap.execution_provider
    }
  };
}

/**
 * Format external transaction as activity item
 */
function formatExternalActivity(tx: any, userWalletAddresses: string[]): ActivityItem {
  // Determine if this is incoming (deposit) or outgoing (withdrawal)
  // Check if sender is in user's wallets (outgoing) or recipient is in user's wallets (incoming)
  const senderInUserWallets = tx.sender && userWalletAddresses.includes(tx.sender);
  const recipientInUserWallets = tx.recipient && userWalletAddresses.includes(tx.recipient);
  
  // If sender is user's wallet -> outgoing (Sent)
  // If recipient is user's wallet -> incoming (Received)
  const isIncoming = recipientInUserWallets && !senderInUserWallets;
  const isOutgoing = senderInUserWallets && !recipientInUserWallets;
  
  // Fallback: if both or neither match, use is_withdrawal flag if available
  let direction: string;
  if (isIncoming) {
    direction = 'Received';
  } else if (isOutgoing) {
    direction = 'Sent';
  } else {
    // Fallback logic
    direction = tx.is_withdrawal ? 'Sent' : 'Received';
  }
  
  const symbol = tx.token_symbol || tx.tokenSymbol || 'SOL';
  const amount = tx.amount || 0;

  // Handle timestamp - block_time could be seconds (number) or ISO string
  let timestamp: string;
  if (tx.block_time) {
    if (typeof tx.block_time === 'number') {
      // If it's a number, treat as Unix timestamp in seconds
      timestamp = new Date(tx.block_time * 1000).toISOString();
    } else if (typeof tx.block_time === 'string') {
      // If it's already a string, check if it's ISO format or needs conversion
      if (tx.block_time.includes('T') || tx.block_time.includes('Z')) {
        timestamp = tx.block_time; // Already ISO format
      } else {
        // Try to parse as number string
        const parsed = parseFloat(tx.block_time);
        timestamp = isNaN(parsed) ? new Date().toISOString() : new Date(parsed * 1000).toISOString();
      }
    } else {
      timestamp = new Date().toISOString();
    }
  } else if (tx.blockTime) {
    timestamp = typeof tx.blockTime === 'number' 
      ? new Date(tx.blockTime * 1000).toISOString()
      : (typeof tx.blockTime === 'string' ? tx.blockTime : new Date().toISOString());
  } else if (tx.created_at) {
    timestamp = tx.created_at;
  } else {
    timestamp = new Date().toISOString();
  }

  return {
    id: tx.signature || tx.id || Math.random().toString(),
    type: 'external',
    title: `${direction} ${amount} ${symbol}`,
    description: isIncoming ? 'External deposit' : 'Sent to external address',
    timestamp,
    status: tx.status || 'confirmed',
    metadata: {
      signature: tx.signature,
      solscanUrl: tx.solscan_url || tx.solscanUrl || `https://solscan.io/tx/${tx.signature}`,
      tokenSymbol: symbol,
      amount: amount,
      valueUsd: tx.value_usd || tx.valueUsd,
      sender: tx.sender,
      recipient: tx.recipient
    }
  };
}

export default router;

