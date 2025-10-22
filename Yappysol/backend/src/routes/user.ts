import express from 'express';
import { UserModel } from '../models/UserSupabase';
import { validateUsername } from '../utils/usernameValidation';
import { usernameCheckLimiter, profileUpdateLimiter } from '../middlewares/rateLimiter';
import { asyncHandler } from '../utils/asyncHandler';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = express.Router();

// Check username availability (public endpoint)
router.get('/username/check', usernameCheckLimiter, asyncHandler(async (req, res) => {
  const { username } = req.query;
  
  if (!username || typeof username !== 'string') {
    return res.status(400).json({
      available: false,
      message: 'Username parameter is required'
    });
  }

  const validation = validateUsername(username);
  if (!validation.valid) {
    return res.status(200).json({
      available: false,
      username: username,
      message: validation.message
    });
  }

  const isAvailable = await UserModel.isUsernameAvailable(validation.username!);
  
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
    // Check if user already has a username
    if (currentUser.username) {
      return res.status(400).json({
        success: false,
        error: 'USERNAME_ALREADY_SET',
        message: 'Username cannot be changed once set'
      });
    }

    const validation = validateUsername(username);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: 'INVALID_USERNAME',
        message: validation.message
      });
    }

    // Check availability
    const isAvailable = await UserModel.isUsernameAvailable(validation.username!);
    if (!isAvailable) {
      return res.status(409).json({
        success: false,
        error: 'USERNAME_TAKEN',
        message: 'This username is already taken'
      });
    }

    updates.username = validation.username;
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

export default router;
