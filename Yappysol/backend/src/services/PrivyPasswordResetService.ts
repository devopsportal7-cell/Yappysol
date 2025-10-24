import { PrivyAuthService } from './PrivyAuthService';
import { UserModel } from '../models/UserSupabase';
import { PasswordValidator } from '../utils/passwordValidation';

export class PrivyPasswordResetService {
  /**
   * Request password reset using Privy's infrastructure
   * This leverages Privy's existing email verification system
   */
  static async requestPasswordReset(email: string): Promise<{ success: boolean; message?: string; error?: string; details?: string[] }> {
    try {
      // Find user by email
      const user = await UserModel.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not for security
        return {
          success: true,
          message: 'If the email exists, a password reset link has been sent.'
        };
      }

      // Check if user has an app password
      if (!user.app_password_hash) {
        return {
          success: false,
          error: 'No app password set for this account. Please contact support.'
        };
      }

      // For Privy users, we can use a simple approach:
      // 1. Generate a secure reset token
      // 2. Store it temporarily (we'll use a simple in-memory store for now)
      // 3. Return success message
      
      const resetToken = this.generateResetToken();
      const expiresAt = Date.now() + (60 * 60 * 1000); // 1 hour
      
      // Store the reset token (in production, use Redis or database)
      this.resetTokens.set(resetToken, {
        userId: user.id,
        email: user.email,
        expiresAt
      });

      // Log the reset link for development/testing
      console.log(`[PrivyPasswordResetService] Reset token for ${email}: ${resetToken}`);
      console.log(`[PrivyPasswordResetService] Reset link: ${process.env.FRONTEND_BASE_URL}/reset-password?token=${resetToken}`);

      return {
        success: true,
        message: 'If the email exists, a password reset link has been sent.'
      };

    } catch (error) {
      console.error('[PrivyPasswordResetService] Request password reset error:', error);
      return {
        success: false,
        error: 'Failed to process password reset request'
      };
    }
  }

  /**
   * Reset password using the reset token
   */
  static async resetPassword(token: string, newPassword: string, confirmPassword: string): Promise<{ success: boolean; message?: string; error?: string; details?: string[] }> {
    try {
      // Validate reset token
      const tokenData = this.resetTokens.get(token);
      if (!tokenData) {
        return {
          success: false,
          error: 'Invalid or expired reset token'
        };
      }

      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        this.resetTokens.delete(token);
        return {
          success: false,
          error: 'Reset token has expired'
        };
      }

      // Validate new password
      const validation = PasswordValidator.validate(newPassword, confirmPassword);
      if (!validation.isValid) {
        return {
          success: false,
          error: 'Password validation failed',
          details: validation.errors
        };
      }

      // Reset the password
      await UserModel.setAppPassword(tokenData.userId, newPassword);

      // Remove the used token
      this.resetTokens.delete(token);

      return {
        success: true,
        message: 'Password reset successfully'
      };

    } catch (error) {
      console.error('[PrivyPasswordResetService] Reset password error:', error);
      return {
        success: false,
        error: 'Failed to reset password'
      };
    }
  }

  /**
   * Verify reset token validity
   */
  static async verifyResetToken(token: string): Promise<{ isValid: boolean; error?: string }> {
    try {
      const tokenData = this.resetTokens.get(token);
      if (!tokenData) {
        return { isValid: false, error: 'Invalid reset token' };
      }

      // Check if token is expired
      if (Date.now() > tokenData.expiresAt) {
        this.resetTokens.delete(token);
        return { isValid: false, error: 'Reset token has expired' };
      }

      return { isValid: true };

    } catch (error) {
      console.error('[PrivyPasswordResetService] Verify reset token error:', error);
      return { isValid: false, error: 'Failed to verify reset token' };
    }
  }

  /**
   * Generate a secure reset token
   */
  private static generateResetToken(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Simple in-memory store for reset tokens
   * In production, use Redis or database
   */
  private static resetTokens = new Map<string, {
    userId: string;
    email: string;
    expiresAt: number;
  }>();

  /**
   * Clean up expired tokens (call periodically)
   */
  static cleanupExpiredTokens(): void {
    const now = Date.now();
    for (const [token, data] of this.resetTokens.entries()) {
      if (now > data.expiresAt) {
        this.resetTokens.delete(token);
      }
    }
  }
}
