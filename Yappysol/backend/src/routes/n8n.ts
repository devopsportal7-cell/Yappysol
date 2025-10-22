import express from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// n8n Webhook Integration Endpoint
router.post('/n8n-webhook', asyncHandler(async (req, res) => {
  const { session_id, user_id, text, walletRef } = req.body;
  
  console.log('[N8N] Received webhook request:', { session_id, user_id, text, walletRef });
  
  // Forward to n8n webhook
  const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!n8nWebhookUrl) {
    return res.status(500).json({
      route: 'chat',
      message: 'n8n integration not configured',
      error: 'N8N_WEBHOOK_URL not set'
    });
  }

  try {
    const response = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.BACKEND_SERVER_KEY}`
      },
      body: JSON.stringify({
        session_id,
        user_id,
        text,
        walletRef: walletRef || 'default-wallet'
      })
    });

    if (!response.ok) {
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('[N8N] Response from n8n:', data);
    
    res.json(data);
  } catch (error) {
    console.error('[N8N] Webhook error:', error);
    res.status(500).json({
      route: 'chat',
      message: 'Sorry, I encountered an error processing your request.',
      error: 'n8n webhook failed'
    });
  }
}));

// Server-to-server authentication middleware for n8n
const serverAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  const serverKey = process.env.BACKEND_SERVER_KEY;
  
  if (!serverKey) {
    return res.status(500).json({ error: 'Server authentication not configured' });
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== serverKey) {
    return res.status(401).json({ error: 'Invalid server key' });
  }
  
  next();
};

// Backend endpoints for n8n to call
router.post('/chain/launch/seed', serverAuthMiddleware, asyncHandler(async (req, res) => {
  const { session_id, user_id, wallet, chain, token } = req.body;
  
  console.log('[BACKEND] Launch seed request:', { session_id, user_id, token });
  
  // TODO: Implement token launch seed logic
  res.json({
    pending_id: `pending_${Date.now()}`,
    preview: {
      human_text: `You are about to launch ${token.symbol} token with ${token.supply} supply.`,
      fields: {
        symbol: token.symbol,
        supply: token.supply,
        decimals: token.decimals
      }
    }
  });
}));

router.post('/chain/launch', serverAuthMiddleware, asyncHandler(async (req, res) => {
  const { pending_id, user_id, wallet } = req.body;
  
  console.log('[BACKEND] Launch confirm request:', { pending_id, user_id });
  
  // TODO: Implement actual token launch
  res.json({
    status: 'launched',
    message: 'Token launched successfully!',
    transaction_id: `tx_${Date.now()}`
  });
}));

router.post('/chain/buy/seed', serverAuthMiddleware, asyncHandler(async (req, res) => {
  const { session_id, user_id, wallet, token_symbol, amount } = req.body;
  
  console.log('[BACKEND] Buy seed request:', { session_id, user_id, token_symbol, amount });
  
  // TODO: Implement buy seed logic
  res.json({
    pending_id: `buy_${Date.now()}`,
    preview: {
      human_text: `You are about to buy ${amount} ${token_symbol} tokens.`,
      fields: {
        token: token_symbol,
        amount: amount,
        estimated_cost: '0.1 SOL'
      }
    }
  });
}));

router.post('/chain/buy', serverAuthMiddleware, asyncHandler(async (req, res) => {
  const { pending_id, user_id, wallet } = req.body;
  
  console.log('[BACKEND] Buy confirm request:', { pending_id, user_id });
  
  // TODO: Implement actual token buy
  res.json({
    status: 'bought',
    message: 'Token purchase completed successfully!',
    transaction_id: `buy_tx_${Date.now()}`
  });
}));

router.post('/token/portfolio', serverAuthMiddleware, asyncHandler(async (req, res) => {
  const { user_id, wallet } = req.body;
  
  console.log('[BACKEND] Portfolio request:', { user_id, wallet });
  
  // TODO: Implement portfolio fetching
  res.json({
    status: 'success',
    portfolio: {
      total_value: '1.5 SOL',
      tokens: [
        { symbol: 'SOL', balance: '1.0', value: '1.0 SOL' },
        { symbol: 'USDC', balance: '100', value: '0.5 SOL' }
      ]
    }
  });
}));

router.post('/token/price', asyncHandler(async (req, res) => {
  const { token_symbol } = req.body;
  
  console.log('[BACKEND] Price request:', { token_symbol });
  
  // TODO: Implement price fetching
  res.json({
    status: 'success',
    price: {
      symbol: token_symbol,
      price_usd: '100.50',
      price_sol: '0.1',
      change_24h: '+5.2%'
    }
  });
}));

export default router;
