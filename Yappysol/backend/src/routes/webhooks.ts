import { Router } from 'express';
import { logger } from '../utils/logger';
import { externalTransactionService } from '../services/ExternalTransactionService';
import { requestWalletRefresh } from '../lib/portfolio-refresh';

const router = Router();

/**
 * POST /api/webhooks/helius
 * Receive Helius webhook notifications for transactions
 */
router.post('/helius', async (req, res) => {
  try {
    logger.info('[WEBHOOK] Helius webhook received', { 
      bodyKeys: Object.keys(req.body)
    });

    // Helius sends an array of transactions
    const transactions = Array.isArray(req.body) ? req.body : req.body.body || [req.body];

    if (!transactions || transactions.length === 0) {
      logger.warn('[WEBHOOK] No transactions in payload', { body: req.body });
      return res.status(400).json({ error: 'Invalid payload' });
    }

    let totalProcessed = 0;

    // Process each transaction
    for (const tx of transactions) {
      const processedCount = await processTransaction(tx);
      totalProcessed += processedCount;
    }

    logger.info('[WEBHOOK] Processed transactions', { count: totalProcessed });

    res.json({ 
      success: true, 
      processed: totalProcessed,
      message: 'Webhook processed successfully'
    });
  } catch (error: any) {
    logger.error('[WEBHOOK] Error processing webhook', { error: error.message });
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * Process a single Helius transaction
 */
async function processTransaction(tx: any): Promise<number> {
  let processedCount = 0;

  // Process native SOL transfers
  if (tx.nativeTransfers && Array.isArray(tx.nativeTransfers)) {
    for (const transfer of tx.nativeTransfers) {
      if (transfer.fromUserAccount && transfer.toUserAccount) {
        // Get user ID by recipient (incoming) or sender (outgoing)
        const recipient = transfer.toUserAccount;
        const sender = transfer.fromUserAccount;
        
        const userId = await externalTransactionService.getUserIdByWallet(recipient) || 
                      await externalTransactionService.getUserIdByWallet(sender);
        
        if (!userId) {
          continue;
        }

        const walletAddress = userId ? recipient : sender;

        await processNativeTransfer(
          transfer,
          {
            signature: tx.signature,
            blockTime: tx.timestamp,
            slot: tx.slot
          },
          walletAddress
        );
        processedCount++;
      }
    }
  }

  // Process SPL token transfers
  if (tx.tokenTransfers && Array.isArray(tx.tokenTransfers)) {
    for (const transfer of tx.tokenTransfers) {
      if (transfer.fromUserAccount && transfer.toUserAccount && transfer.mint) {
        // Get user ID by recipient (incoming) or sender (outgoing)
        const recipient = transfer.toUserAccount;
        const sender = transfer.fromUserAccount;
        
        const userId = await externalTransactionService.getUserIdByWallet(recipient) || 
                      await externalTransactionService.getUserIdByWallet(sender);
        
        if (!userId) {
          continue;
        }

        const walletAddress = userId ? recipient : sender;

        await processTokenTransfer(
          transfer,
          {
            signature: tx.signature,
            blockTime: tx.timestamp,
            slot: tx.slot
          },
          walletAddress
        );
        processedCount++;
      }
    }
  }

  return processedCount;
}

/**
 * Process webhook events from Helius (OLD - kept for reference)
 */
async function processWebhookEvents(
  accountData: any[], 
  transaction: any, 
  timestamp: number
): Promise<number> {
  let processedCount = 0;

  for (const account of accountData) {
    try {
      // Extract transaction information
      const walletAddress = account.account;
      const nativeTransfers = account.nativeTransfers || [];
      const tokenTransfers = account.tokenTransfers || [];

      logger.info('[WEBHOOK] Processing account', { 
        wallet: walletAddress,
        nativeTransfers: nativeTransfers.length,
        tokenTransfers: tokenTransfers.length
      });

      // Process native SOL transfers
      for (const transfer of nativeTransfers) {
        await processNativeTransfer(transfer, transaction, walletAddress);
        processedCount++;
      }

      // Process SPL token transfers
      for (const transfer of tokenTransfers) {
        await processTokenTransfer(transfer, transaction, walletAddress);
        processedCount++;
      }

      // Trigger balance refresh for this wallet
      requestWalletRefresh(walletAddress, true);
      
    } catch (error: any) {
      logger.error('[WEBHOOK] Error processing account event', { 
        error: error.message,
        wallet: account.account 
      });
    }
  }

  return processedCount;
}

/**
 * Process native SOL transfers
 */
async function processNativeTransfer(
  transfer: any,
  transaction: any,
  walletAddress: string
): Promise<void> {
  try {
    const fromAccount = transfer.fromUserAccount;
    const toAccount = transfer.toUserAccount;
    const amount = transfer.amount || 0;

    // Determine if this is incoming or outgoing
    const isIncoming = toAccount === walletAddress;
    const isOutgoing = fromAccount === walletAddress;

    if (!isIncoming && !isOutgoing) {
      return; // Not relevant to this wallet
    }

    // Get user ID by wallet address
    const userId = await externalTransactionService.getUserIdByWallet(walletAddress);
    if (!userId) {
      logger.warn('[WEBHOOK] No user found for wallet', { wallet: walletAddress });
      return;
    }

    // Convert lamports to SOL
    const amountInSol = amount / 1e9;

    // Check if already stored
    const exists = await checkTransactionExists(transaction.signature);
    if (exists) {
      logger.debug('[WEBHOOK] Transaction already processed', { signature: transaction.signature });
      return;
    }

    // Create transaction record
    const externalTx = {
      signature: transaction.signature,
      blockTime: transaction.blockTime || Date.now(),
      amount: amountInSol,
      tokenMint: 'So11111111111111111111111111111111111111112',
      tokenSymbol: 'SOL',
      tokenName: 'Solana',
      sender: fromAccount,
      recipient: toAccount,
      type: 'SOL' as const,
      solscanUrl: `https://solscan.io/tx/${transaction.signature}`
    };

    // Store transaction
    await externalTransactionService.storeExternalTransaction(
      externalTx, 
      userId,
      Date.now()
    );

    logger.info('[WEBHOOK] Native SOL transfer processed', {
      signature: transaction.signature,
      amount: amountInSol,
      direction: isIncoming ? 'incoming' : 'outgoing',
      wallet: walletAddress
    });
  } catch (error: any) {
    logger.error('[WEBHOOK] Error processing native transfer', { error: error.message });
  }
}

/**
 * Process SPL token transfers (USDC, USDT, etc.)
 */
async function processTokenTransfer(
  transfer: any,
  transaction: any,
  walletAddress: string
): Promise<void> {
  try {
    const fromAccount = transfer.fromUserAccount;
    const toAccount = transfer.toUserAccount;
    const amount = transfer.amount || 0;
    const mint = transfer.mint;

    if (!mint) {
      logger.warn('[WEBHOOK] Token transfer missing mint', { transfer });
      return;
    }

    // Determine if this is incoming or outgoing
    const isIncoming = toAccount === walletAddress;
    const isOutgoing = fromAccount === walletAddress;

    if (!isIncoming && !isOutgoing) {
      return; // Not relevant to this wallet
    }

    // Get user ID by wallet address
    const userId = await externalTransactionService.getUserIdByWallet(walletAddress);
    if (!userId) {
      logger.warn('[WEBHOOK] No user found for wallet', { wallet: walletAddress });
      return;
    }

    // Get token symbol from mint
    const tokenSymbol = await getTokenSymbol(mint);
    const tokenDecimals = await getTokenDecimals(mint);
    const amountInTokens = amount / Math.pow(10, tokenDecimals);

    // Check if already stored
    const exists = await checkTransactionExists(transaction.signature);
    if (exists) {
      logger.debug('[WEBHOOK] Transaction already processed', { signature: transaction.signature });
      return;
    }

    // Create transaction record
    const externalTx = {
      signature: transaction.signature,
      blockTime: transaction.blockTime || Date.now(),
      amount: amountInTokens,
      tokenMint: mint,
      tokenSymbol,
      tokenName: tokenSymbol,
      sender: fromAccount,
      recipient: toAccount,
      type: 'SPL' as const,
      solscanUrl: `https://solscan.io/tx/${transaction.signature}`
    };

    // Store transaction
    await externalTransactionService.storeExternalTransaction(
      externalTx, 
      userId,
      Date.now()
    );

    logger.info('[WEBHOOK] SPL token transfer processed', {
      signature: transaction.signature,
      amount: amountInTokens,
      token: tokenSymbol,
      direction: isIncoming ? 'incoming' : 'outgoing',
      wallet: walletAddress
    });
  } catch (error: any) {
    logger.error('[WEBHOOK] Error processing token transfer', { error: error.message });
  }
}

/**
 * Check if transaction already exists in database
 */
async function checkTransactionExists(signature: string): Promise<boolean> {
  try {
    const { supabase } = await import('../lib/supabase');
    const { data, error } = await supabase
      .from('external_transactions')
      .select('id')
      .eq('signature', signature)
      .single();

    return !error && !!data;
  } catch (error) {
    return false;
  }
}

/**
 * Get token symbol from mint address
 */
async function getTokenSymbol(mint: string): Promise<string> {
  // Try cache first
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: cached } = await supabase
      .from('token_balance_cache')
      .select('token_symbol')
      .eq('token_mint', mint)
      .single();

    if (cached?.token_symbol) {
      return cached.token_symbol;
    }
  } catch (error) {
    // Ignore cache lookup errors
  }

  // Hardcoded known tokens
  const knownTokens: Record<string, string> = {
    'So11111111111111111111111111111111111111112': 'SOL',
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 'BONK',
  };

  return knownTokens[mint] || 'UNKNOWN';
}

/**
 * Get token decimals from mint address
 */
async function getTokenDecimals(mint: string): Promise<number> {
  // Try cache first
  try {
    const { supabase } = await import('../lib/supabase');
    const { data: cached } = await supabase
      .from('token_balance_cache')
      .select('decimals')
      .eq('token_mint', mint)
      .single();

    if (cached?.decimals !== undefined) {
      return cached.decimals;
    }
  } catch (error) {
    // Ignore cache lookup errors
  }

  // Hardcoded known tokens
  const knownDecimals: Record<string, number> = {
    'So11111111111111111111111111111111111111112': 9,
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 6,
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 6,
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': 5,
  };

  return knownDecimals[mint] || 9;
}

export default router;
