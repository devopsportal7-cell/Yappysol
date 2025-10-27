import { Router } from 'express';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

/**
 * Diagnostic endpoint to check WebSocket status
 * GET /api/diagnostics/websocket
 */
router.get('/websocket', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { websocketBalanceSubscriber } = await import('../services/WebsocketBalanceSubscriber');
    
    // Check connection status
    const stats = {
      isConnected: websocketBalanceSubscriber['isConnected'],
      subscribedWallets: Array.from(websocketBalanceSubscriber['subscribedWallets']),
      subscriptionCount: websocketBalanceSubscriber['subscriptionIds'].size,
      subscriptions: Array.from(websocketBalanceSubscriber['subscriptionIds'].entries()).map(([wallet, subId]) => ({
        wallet,
        subscriptionId: subId
      }))
    };

    res.json({
      success: true,
      message: 'WebSocket diagnostics',
      data: {
        connectionStatus: stats.isConnected ? 'Connected ✅' : 'Not Connected ❌',
        ...stats,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[DIAGNOSTICS] Error checking WebSocket status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

/**
 * Test endpoint to manually check for external transactions
 * POST /api/diagnostics/check-transactions
 */
router.post('/check-transactions', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const { walletAddress } = req.body;
    
    if (!walletAddress) {
      return res.status(400).json({
        success: false,
        error: 'walletAddress is required'
      });
    }

    const { externalTransactionService } = await import('../services/ExternalTransactionService');
    
    console.log('[DIAGNOSTICS] Manually checking for external transactions:', walletAddress);
    
    const transactions = await externalTransactionService.checkForExternalDeposits(walletAddress);
    
    res.json({
      success: true,
      message: `Found ${transactions.length} external transactions`,
      data: {
        walletAddress,
        transactionCount: transactions.length,
        transactions: transactions.map(tx => ({
          signature: tx.signature,
          amount: tx.amount,
          tokenSymbol: tx.tokenSymbol,
          sender: tx.sender,
          timestamp: new Date(tx.blockTime * 1000).toISOString()
        })),
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('[DIAGNOSTICS] Error checking transactions:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
}));

export default router;

