import { Router } from 'express';
import { AuthService } from '../services/AuthService';
import { PrivyAuthService } from '../services/PrivyAuthService';
import { UserSessionModel } from '../models/UserSessionSupabase';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';
import crypto from 'crypto';

const router = Router();

// Register endpoint
router.post('/register', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters long' });
  }

  const result = await AuthService.register({ email, password });
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.status(201).json({
    message: 'User created successfully',
    user: {
      id: result.user!.id,
      email: result.user!.email,
      username: result.user!.username || null,
      onboardingCompleted: result.user!.onboarding_completed || false,
      createdAt: result.user!.created_at,
      solBalance: 0
    },
    token: result.token
  });
}));

// Login endpoint
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const result = await AuthService.login({ email, password });
  
  if (!result.success) {
    return res.status(401).json({ error: result.error });
  }

  res.json({
    message: 'Login successful',
    user: {
      id: result.user!.id,
      email: result.user!.email,
      username: result.user!.username || null,
      onboardingCompleted: result.user!.onboarding_completed || false,
      createdAt: result.user!.created_at
    },
    token: result.token
  });
}));

// Import wallet endpoint
router.post('/import-wallet', authMiddleware, asyncHandler(async (req, res) => {
  const { privateKey } = req.body;
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  if (!privateKey) {
    return res.status(400).json({ error: 'Private key is required' });
  }

  const result = await AuthService.importWallet(userId, privateKey);
  
  if (!result.success) {
    return res.status(400).json({ error: result.error });
  }

  res.json({
    message: 'Wallet imported successfully',
    wallet: {
      id: result.wallet!.id,
      publicKey: result.wallet!.public_key,
      isImported: result.wallet!.is_imported
    }
  });
}));

// Get user wallets
router.get('/wallets', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const wallets = await AuthService.getUserWallets(userId);
  console.log('[AUTH] getUserWallets result:', JSON.stringify(wallets, null, 2));
  
  res.json({
    wallets: wallets.map(wallet => ({
      id: wallet.id,
      publicKey: wallet.publicKey,
      isImported: wallet.isImported,
      balance: wallet.balance
    }))
  });
}));

// Get user API keys
router.get('/api-keys', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  const apiKeys = await AuthService.getUserApiKeys(userId);
  
  res.json({
    apiKeys: apiKeys.map(apiKey => ({
      id: apiKey.id,
      service: apiKey.service,
      createdAt: apiKey.created_at
    }))
  });
}));

// Privy authentication endpoint
router.post('/privy', asyncHandler(async (req, res) => {
  try {
    console.log('Backend: Received Privy auth request');
    console.log('Backend: Request body:', req.body);
    
    const { privyToken, privyUser } = req.body;
    
    if (!privyToken) {
      console.log('Backend: No Privy token provided');
      return res.status(400).json({ 
        success: false,
        error: 'Privy token required' 
      });
    }

    console.log('Backend: Calling PrivyAuthService.verifyPrivyToken');
    const result = await PrivyAuthService.verifyPrivyToken(privyToken, privyUser);
    console.log('Backend: PrivyAuthService result:', result);
    
    if (result.success) {
      console.log('Backend: Privy authentication successful');
      res.json({
        success: true,
        message: 'Privy authentication successful',
        user: {
          id: result.user!.id,
          email: result.user!.email,
          username: result.user!.username || null,
          onboardingCompleted: result.user!.onboarding_completed || false,
          createdAt: result.user!.created_at,
          wallets: result.user!.wallets || [],
          portfolio: result.user!.portfolio || null
        },
        token: result.token
      });
    } else {
      console.log('Backend: Privy authentication failed:', result.error);
      res.status(401).json({
        success: false,
        error: result.error || 'Privy authentication failed'
      });
    }
  } catch (error) {
    console.error('Backend: Privy auth route error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error during Privy authentication'
    });
  }
}));

// Verify token endpoint
router.get('/verify', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    valid: true,
    user: {
      id: req.user!.id,
      email: req.user!.email,
      username: req.user!.username || null,
      onboardingCompleted: req.user!.onboarding_completed || false,
      createdAt: req.user!.created_at,
      solBalance: 0
    }
  });
}));

// Logout endpoint
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (token) {
      // Deactivate the current session
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      const session = await UserSessionModel.findByInternalTokenHash(tokenHash);
      if (session) {
        await UserSessionModel.deactivateSession(session.id);
      }
    }

    res.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.json({
      message: 'Logged out successfully'
    });
  }
}));

// Logout all sessions endpoint
router.post('/logout-all', authMiddleware, asyncHandler(async (req, res) => {
  try {
    if (req.user?.id) {
      await UserSessionModel.deactivateAllUserSessions(req.user.id);
    }

    res.json({
      message: 'All sessions logged out successfully'
    });
  } catch (error) {
    console.error('Logout all error:', error);
    res.status(500).json({
      error: 'Failed to logout all sessions'
    });
  }
}));

export default router;
