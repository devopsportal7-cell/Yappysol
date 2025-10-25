import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import { logger } from '../utils/logger';
import { balanceCacheService } from '../services/BalanceCacheService';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { requestWalletRefresh } from '../lib/portfolio-refresh';
import { websocketBalanceSubscriber } from '../services/WebsocketBalanceSubscriber';

const router = Router();

/**
 * Get wallet balance (cached)
 */
router.get('/:address/balance', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    const portfolio = await balanceCacheService.getFromCache(address);

    if (!portfolio) {
      return res.status(404).json({
        success: false,
        error: 'WALLET_NOT_FOUND',
        message: 'Wallet not found or unable to fetch balance'
      });
    }

    res.json({
      success: true,
      data: portfolio
    });

  } catch (error) {
    logger.error('Error getting wallet balance', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get wallet balance'
    });
  }
}));

/**
 * Get transaction history (internal + external)
 */
router.get('/:address/history', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100); // Max 100
    const offset = (pageNum - 1) * limitNum;

    // Get internal transactions
    const { data: internalTxs } = await supabase
      .from('transactions')
      .select('*')
      .eq('sender_wallet', address)
      .or(`recipient_wallet.eq.${address}`)
      .order('created_at', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Get external transactions
    const { data: externalTxs } = await supabase
      .from('external_transactions')
      .select('*')
      .eq('recipient', address)
      .order('block_time', { ascending: false })
      .range(offset, offset + limitNum - 1);

    // Combine and sort by timestamp
    const allTransactions = [
      ...(internalTxs || []).map((tx: any) => ({ 
        ...tx, 
        type: 'internal',
        timestamp: new Date(tx.created_at).getTime()
      })),
      ...(externalTxs || []).map((tx: any) => ({ 
        ...tx, 
        type: 'external',
        timestamp: tx.block_time * 1000
      }))
    ].sort((a, b) => b.timestamp - a.timestamp);

    res.json({
      success: true,
      data: allTransactions,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: allTransactions.length
      }
    });

  } catch (error) {
    logger.error('Error getting transaction history', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get transaction history'
    });
  }
}));

/**
 * Get external transactions only
 */
router.get('/:address/external-transactions', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = Math.min(parseInt(limit as string, 10), 100);
    const offset = (pageNum - 1) * limitNum;

    const { data: externalTxs, count } = await supabase
      .from('external_transactions')
      .select('*', { count: 'exact' })
      .eq('recipient', address)
      .order('block_time', { ascending: false })
      .range(offset, offset + limitNum - 1);

    res.json({
      success: true,
      data: externalTxs || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0
      }
    });

  } catch (error) {
    logger.error('Error getting external transactions', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get external transactions'
    });
  }
}));

/**
 * Force refresh wallet balance
 */
router.post('/:address/refresh', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    // Request immediate refresh
    requestWalletRefresh(address, true);

    res.json({
      success: true,
      message: 'Wallet refresh requested'
    });

  } catch (error) {
    logger.error('Error requesting wallet refresh', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to request wallet refresh'
    });
  }
}));

/**
 * Subscribe to wallet for real-time updates
 */
router.post('/:address/subscribe', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    // Subscribe to WebSocket notifications
    const success = await websocketBalanceSubscriber.subscribeToWallet(address);

    res.json({
      success,
      message: success ? 'Subscribed to wallet updates' : 'Failed to subscribe to wallet updates'
    });

  } catch (error) {
    logger.error('Error subscribing to wallet', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to subscribe to wallet'
    });
  }
}));

/**
 * Unsubscribe from wallet updates
 */
router.post('/:address/unsubscribe', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { address } = req.params;
    const userId = (req as any).user!.id;

    // Verify user owns this wallet
    const { supabase } = await import('../lib/supabase');
    const { data: wallet, error } = await supabase
      .from('wallets')
      .select('id')
      .eq('public_key', address)
      .eq('user_id', userId)
      .single();

    if (error || !wallet) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    // Unsubscribe from WebSocket notifications
    const success = await websocketBalanceSubscriber.unsubscribeFromWallet(address);

    res.json({
      success,
      message: success ? 'Unsubscribed from wallet updates' : 'Failed to unsubscribe from wallet updates'
    });

  } catch (error) {
    logger.error('Error unsubscribing from wallet', { error, address: req.params.address });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to unsubscribe from wallet'
    });
  }
}));

/**
 * SSE endpoint for real-time updates
 */
router.get('/:address/events', authMiddleware, async (req, res) => {
  const { address } = req.params;
  const userId = (req as any).user!.id;

  // Verify user owns this wallet
  const { supabase } = await import('../lib/supabase');
  supabase
    .from('wallets')
    .select('id')
    .eq('public_key', address)
    .eq('user_id', userId)
    .single()
    .then(({ data: wallet, error }: { data: any, error: any }) => {
      if (error || !wallet) {
        res.status(403).json({
          success: false,
          error: 'ACCESS_DENIED',
          message: 'Access denied to this wallet'
        });
        return;
      }

      // Set up SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Subscribe to wallet updates
      const { onWalletUpdatedForWallet } = require('../lib/events');
      const unsubscribe = onWalletUpdatedForWallet(address, (payload: any) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      });

      // Handle client disconnect
      req.on('close', () => {
        unsubscribe();
        logger.info('[SSE] Client disconnected', { address });
      });

      // Send initial connection message
      res.write(`data: ${JSON.stringify({
        type: 'connected',
        wallet: address,
        timestamp: new Date().toISOString()
      })}\n\n`);
    })
    .catch((error: any) => {
      logger.error('Error setting up SSE', { error, address });
      res.status(500).json({
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'Failed to set up real-time updates'
      });
    });
});

/**
 * Get WebSocket connection status
 */
router.get('/websocket/status', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const status = websocketBalanceSubscriber.getConnectionStatus();
    
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting WebSocket status', { error });
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to get WebSocket status'
    });
  }
}));

export default router;
