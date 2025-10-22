import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/AuthService';
import { PrivyAuthService } from '../services/PrivyAuthService';
import { UserModel } from '../models/UserSupabase';
import { UserSessionModel } from '../models/UserSessionSupabase';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id?: string;
        email?: string;
        username?: string | null;
        onboarding_completed?: boolean;
        created_at?: string;
        wallet?: string;
        authType?: 'jwt' | 'privy';
      };
    }
  }
}

const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Try JWT authentication first
    let payload = AuthService.verifyToken(token);
    let user;
    
    if (payload) {
      // Standard JWT authentication
      user = await UserModel.findById(payload.userId);
      if (user) {
        // Update session last accessed time
        try {
          const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
          await UserSessionModel.updateLastAccessed(
            (await UserSessionModel.findByInternalTokenHash(tokenHash))?.id || ''
          );
        } catch (error) {
          console.error('Failed to update session access time:', error);
          // Don't fail authentication if session update fails
        }

        req.user = {
          id: user.id,
          email: user.email,
          username: user.username,
          onboarding_completed: user.onboarding_completed,
          created_at: user.created_at,
          authType: payload.authType || 'jwt'
        };
        next();
        return;
      }
    }

    // Try Privy authentication if JWT fails
    if (PrivyAuthService.isPrivyConfigured()) {
      const privyResult = await PrivyAuthService.verifyPrivyToken(token);
      if (privyResult.success && privyResult.user) {
        user = privyResult.user;
        payload = AuthService.verifyToken(privyResult.token!);
        
        if (user && payload) {
          req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            onboarding_completed: user.onboarding_completed,
            created_at: user.created_at,
            authType: 'privy'
          };
          next();
          return;
        }
      }
    }

    return res.status(401).json({ error: 'Invalid token' });
  } catch (error) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// Legacy middleware for backward compatibility
const legacyAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const walletAddress = req.headers['x-wallet-address'] as string;
  
  if (!walletAddress) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  req.user = { wallet: walletAddress };
  next();
};

export { authMiddleware, legacyAuthMiddleware }; 