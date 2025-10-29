import { Request, Response } from 'express';
import { UserModel } from '../models/UserSupabase';
import { PasswordValidator } from '../utils/passwordValidation';
import { PrivyPasswordResetService } from '../services/PrivyPasswordResetService';
import { authMiddleware } from '../middlewares/authMiddleware';

export class PasswordController {
  /**
   * Set app password for first-time users
   * POST /api/user/password/set
   */
  static async setPassword(req: Request, res: Response) {
    try {
      const { password, confirmPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!password || !confirmPassword) {
        return res.status(400).json({ 
          error: 'Password and confirm password are required' 
        });
      }

      // Validate password
      const validation = PasswordValidator.validate(password, confirmPassword);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          details: validation.errors
        });
      }

      // Check if user already has an app password
      const hasPassword = await UserModel.hasAppPassword(userId);
      if (hasPassword) {
        return res.status(400).json({
          error: 'App password already set. Use update endpoint to change it.'
        });
      }

      // Set the password
      await UserModel.setAppPassword(userId, password);

      res.json({
        success: true,
        message: 'App password set successfully',
        strength: PasswordValidator.getPasswordStrength(password)
      });

    } catch (error) {
      console.error('[PasswordController] Set password error:', error);
      res.status(500).json({
        error: 'Failed to set app password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update existing app password
   * PUT /api/user/password/update
   */
  static async updatePassword(req: Request, res: Response) {
    try {
      const { currentPassword, newPassword, confirmPassword } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!currentPassword || !newPassword || !confirmPassword) {
        return res.status(400).json({ 
          error: 'Current password, new password, and confirm password are required' 
        });
      }

      // Get user to validate current password
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Validate current password
      const isCurrentPasswordValid = await UserModel.validateAppPassword(user, currentPassword);
      if (!isCurrentPasswordValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }

      // Validate new password
      const validation = PasswordValidator.validate(newPassword, confirmPassword);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'New password validation failed',
          details: validation.errors
        });
      }

      // Update the password
      await UserModel.setAppPassword(userId, newPassword);

      res.json({
        success: true,
        message: 'App password updated successfully',
        strength: PasswordValidator.getPasswordStrength(newPassword)
      });

    } catch (error) {
      console.error('[PasswordController] Update password error:', error);
      res.status(500).json({
        error: 'Failed to update app password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify app password
   * POST /api/user/password/verify
   */
  // Internal method for password verification (used by other controllers)
  static async verifyPasswordInternal(userId: string, password: string): Promise<boolean> {
    try {
      const user = await UserModel.findById(userId);
      if (!user || !user.app_password_hash) {
        return false;
      }

      const bcrypt = require('bcrypt');
      return await bcrypt.compare(password, user.app_password_hash);
    } catch (error) {
      console.error('[PasswordController] Error verifying password internally:', error);
      return false;
    }
  }

  static async verifyPassword(req: Request, res: Response) {
    try {
      const { password } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      // Get user to validate password
      const user = await UserModel.findById(userId);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Check if user has an app password
      if (!user.app_password_hash) {
        return res.status(400).json({ 
          error: 'No app password set. Please set a password first.' 
        });
      }

      // Validate password
      const isValid = await UserModel.validateAppPassword(user, password);

      res.json({
        success: true,
        isValid,
        message: isValid ? 'Password verified successfully' : 'Invalid password'
      });

    } catch (error) {
      console.error('[PasswordController] Verify password error:', error);
      res.status(500).json({
        error: 'Failed to verify app password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if user has app password set
   * GET /api/user/password/status
   */
  static async getPasswordStatus(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasPassword = await UserModel.hasAppPassword(userId);

      res.json({
        success: true,
        hasPassword,
        message: hasPassword ? 'App password is set' : 'No app password set'
      });

    } catch (error) {
      console.error('[PasswordController] Get password status error:', error);
      res.status(500).json({
        error: 'Failed to get password status',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Validate password strength without setting it
   * POST /api/user/password/validate
   */
  static async validatePassword(req: Request, res: Response) {
    try {
      const { password, confirmPassword } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Password is required' });
      }

      const validation = PasswordValidator.validate(password, confirmPassword);
      const strength = PasswordValidator.getPasswordStrength(password);

      res.json({
        success: true,
        isValid: validation.isValid,
        strength,
        errors: validation.errors,
        message: validation.isValid ? 'Password is valid' : 'Password validation failed'
      });

    } catch (error) {
      console.error('[PasswordController] Validate password error:', error);
      res.status(500).json({
        error: 'Failed to validate password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Request password reset (forgot password) - Privy Integration
   * POST /api/user/password/forgot
   */
  static async forgotPassword(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const result = await PrivyPasswordResetService.requestPasswordReset(email);

      if (result.success) {
        res.json({
          success: true,
          message: result.message
        });
      } else {
        res.status(400).json({
          error: result.error,
          ...(result.details && { details: result.details })
        });
      }

    } catch (error) {
      console.error('[PasswordController] Forgot password error:', error);
      res.status(500).json({
        error: 'Failed to process password reset request',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset password using reset token - Privy Integration
   * POST /api/user/password/reset
   */
  static async resetPassword(req: Request, res: Response) {
    try {
      const { token, newPassword, confirmPassword } = req.body;

      if (!token || !newPassword || !confirmPassword) {
        return res.status(400).json({ 
          error: 'Reset token, new password, and confirm password are required' 
        });
      }

      const result = await PrivyPasswordResetService.resetPassword(token, newPassword, confirmPassword);

      if (result.success) {
        res.json({
          success: true,
          message: result.message,
          strength: PasswordValidator.getPasswordStrength(newPassword)
        });
      } else {
        res.status(400).json({
          error: result.error,
          ...(result.details && { details: result.details })
        });
      }

    } catch (error) {
      console.error('[PasswordController] Reset password error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Verify reset token validity - Privy Integration
   * GET /api/user/password/reset/verify/:token
   */
  static async verifyResetToken(req: Request, res: Response) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({ error: 'Reset token is required' });
      }

      const result = await PrivyPasswordResetService.verifyResetToken(token);

      res.json({
        success: true,
        isValid: result.isValid,
        message: result.isValid ? 'Token is valid' : result.error
      });

    } catch (error) {
      console.error('[PasswordController] Verify reset token error:', error);
      res.status(500).json({
        error: 'Failed to verify reset token',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reset password with email (after Privy verification)
   * POST /api/user/password/reset-with-email
   * Used when user forgets app password - Works for both logged-in and logged-out users
   * Privy verifies email, then we reset the app password
   */
  static async resetPasswordWithEmail(req: Request, res: Response) {
    try {
      const { email, newPassword, confirmPassword } = req.body;
      const userId = req.user?.id; // Optional - user might be logged in via Privy

      if (!email || !newPassword || !confirmPassword) {
        return res.status(400).json({ 
          error: 'Email, new password, and confirm password are required' 
        });
      }

      // Validate new password
      const validation = PasswordValidator.validate(newPassword, confirmPassword);
      if (!validation.isValid) {
        return res.status(400).json({
          error: 'Password validation failed',
          details: validation.errors
        });
      }

      // Find user - use userId if logged in, otherwise find by email
      let user;
      if (userId) {
        // User is logged in via Privy - use their userId
        user = await UserModel.findById(userId);
        
        // Verify email matches (security check)
        if (user && user.email !== email) {
          return res.status(403).json({ 
            error: 'Email does not match your account' 
          });
        }
      } else {
        // User is not logged in - find by email
        user = await UserModel.findByEmail(email);
      }

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Set the new app password (user is already verified via Privy email)
      await UserModel.setAppPassword(user.id, newPassword);

      res.json({
        success: true,
        message: 'App password reset successfully',
        strength: PasswordValidator.getPasswordStrength(newPassword)
      });

    } catch (error) {
      console.error('[PasswordController] Reset password with email error:', error);
      res.status(500).json({
        error: 'Failed to reset password',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
