import express from 'express';
import { UserModel } from '../models/UserSupabase';
import { validateUsername } from '../utils/usernameValidation';
import { usernameCheckLimiter, profileUpdateLimiter } from '../middlewares/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';

// Optional auth middleware - doesn't fail if no auth token
const optionalAuthMiddleware = (req: any, res: any, next: any) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    req.user = null;
    return next();
  }
  
  // Try to verify token, but don't fail if invalid
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-change-in-production');
    req.user = decoded;
  } catch (error) {
    req.user = null;
  }
  
  next();
};

const router = express.Router();

// Check username availability (supports optional auth for higher rate limits)
router.get('/username/check', optionalAuthMiddleware, usernameCheckLimiter, asyncHandler(async (req, res) => {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      available: false,
      message: 'Username parameter is required'
    });
  }

  // If user is authenticated and already has a username, check if they're trying to change it
  if (req.user?.id) {
    const currentUser = await UserModel.findById(req.user.id);
    if (currentUser?.username) {
      // User already has a username
      if (currentUser.username.toLowerCase() === username.toLowerCase()) {
        // They're checking their own username - it's "available" for them
        return res.status(200).json({
          available: true,
          username: username,
          message: 'This is your current username',
          isCurrentUser: true
        });
      } else {
        // They're trying to change their username - not allowed
        return res.status(200).json({
          available: false,
          username: username,
          message: 'Username cannot be changed once set',
          isCurrentUser: false
        });
      }
    }
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return res.status(200).json({
      available: false,
      username: username,
      message: validation.message
    });
  }

  const isAvailable = await UserModel.isUsernameAvailable(validation.username!, req.user?.id);
  
  res.status(200).json({
    available: isAvailable,
    username: username,
    message: isAvailable ? undefined : 'This username is already taken'
  });
}));

// Update user profile (authenticated endpoint)
router.patch('/profile', authMiddleware, profileUpdateLimiter, asyncHandler(async (req, res) => {
  const { username, onboardingCompleted } = req.body;
  const userId = (req as any).user!.id;

  // Get current user to check if username is already set
  const currentUser = await UserModel.findById(userId);
  if (!currentUser) {
    return res.status(404).json({
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found'
    });
  }

  const updates: any = {};

  // Handle username update
  if (username !== undefined) {
    // Allow username changes - check if it's different from current
    if (currentUser.username && currentUser.username.toLowerCase() === username.toLowerCase()) {
      // Same username, no change needed
      updates.username = currentUser.username;
    } else {
      // Different username - validate and check availability
      const validation = validateUsername(username);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'INVALID_USERNAME',
          message: validation.message
        });
      }

      // Check availability (excluding current user's username)
      const isAvailable = await UserModel.isUsernameAvailable(validation.username!, userId);
      if (!isAvailable) {
        return res.status(409).json({
          success: false,
          error: 'USERNAME_TAKEN',
          message: 'This username is already taken'
        });
      }

      updates.username = validation.username;
    }
  }

  // Handle onboarding completion
  if (onboardingCompleted !== undefined) {
    // Can only transition from false to true
    if (currentUser.onboarding_completed && !onboardingCompleted) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_TRANSITION',
        message: 'Onboarding completion cannot be reversed'
      });
    }
    updates.onboardingCompleted = onboardingCompleted;
  }

  // Update user
  const updatedUser = await UserModel.updateUserProfile(userId, updates);

  res.status(200).json({
    success: true,
    user: {
      id: updatedUser!.id,
      email: updatedUser!.email,
      username: updatedUser!.username,
      onboardingCompleted: updatedUser!.onboarding_completed,
      createdAt: updatedUser!.created_at,
      solBalance: 0 // You'll need to calculate this
    }
  });
}));

// Get onboarding status
router.get('/onboarding/status', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user!.id;
  
  const user = await UserModel.findById(userId);
  if (!user) {
    return res.status(404).json({ 
      success: false,
      error: 'USER_NOT_FOUND',
      message: 'User not found' 
    });
  }

  // Determine onboarding progress
  const progress = {
    step: 1,
    completed: user.onboarding_completed,
    username: user.username,
    hasPassword: !!user.app_password_hash,
    hasWallet: false, // TODO: Check wallet status
    hasExportedPrivateKey: false, // TODO: Track if user has exported private key
    canProceed: true
  };

  // Determine current step
  if (!user.username) {
    progress.step = 2; // Username step
    progress.canProceed = false;
  } else if (!user.app_password_hash) {
    progress.step = 3; // Password step
  } else if (!progress.hasWallet) {
    progress.step = 4; // Wallet step
  } else if (!progress.hasExportedPrivateKey) {
    progress.step = 5; // Private key export step
  } else {
    progress.step = 6; // Complete
  }

  res.json({
    success: true,
    progress
  });
}));

export default router;
