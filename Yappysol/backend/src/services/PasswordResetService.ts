import crypto from 'crypto';
import { supabase, TABLES } from '../lib/supabase';

export interface PasswordResetToken {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
  used: boolean;
  created_at: string;
}

export class PasswordResetService {
  private static readonly TOKEN_EXPIRY_HOURS = 1; // 1 hour expiry
  private static readonly TOKEN_LENGTH = 32;

  /**
   * Generate a secure random token
   */
  private static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }

  /**
   * Create a password reset token for a user
   */
  static async createResetToken(userId: string): Promise<{ token: string; expiresAt: string }> {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

    const resetToken: PasswordResetToken = {
      id: crypto.randomUUID(),
      user_id: userId,
      token,
      expires_at: expiresAt.toISOString(),
      used: false,
      created_at: new Date().toISOString()
    };

    // First, invalidate any existing tokens for this user
    await supabase
      .from(TABLES.PASSWORD_RESET_TOKENS)
      .update({ used: true })
      .eq('user_id', userId)
      .eq('used', false);

    // Insert the new token
    const { error } = await supabase
      .from(TABLES.PASSWORD_RESET_TOKENS)
      .insert([resetToken]);

    if (error) {
      throw new Error(`Failed to create reset token: ${error.message}`);
    }

    return {
      token,
      expiresAt: expiresAt.toISOString()
    };
  }

  /**
   * Validate a password reset token
   */
  static async validateResetToken(token: string): Promise<{ isValid: boolean; userId?: string; error?: string }> {
    const { data, error } = await supabase
      .from(TABLES.PASSWORD_RESET_TOKENS)
      .select('*')
      .eq('token', token)
      .eq('used', false)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return { isValid: false, error: 'Invalid or expired reset token' };
      }
      throw new Error(`Failed to validate reset token: ${error.message}`);
    }

    // Check if token is expired
    const now = new Date();
    const expiresAt = new Date(data.expires_at);
    
    if (now > expiresAt) {
      // Mark token as used
      await supabase
        .from(TABLES.PASSWORD_RESET_TOKENS)
        .update({ used: true })
        .eq('id', data.id);
      
      return { isValid: false, error: 'Reset token has expired' };
    }

    return { isValid: true, userId: data.user_id };
  }

  /**
   * Mark a reset token as used
   */
  static async markTokenAsUsed(token: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.PASSWORD_RESET_TOKENS)
      .update({ used: true })
      .eq('token', token);

    if (error) {
      throw new Error(`Failed to mark token as used: ${error.message}`);
    }
  }

  /**
   * Clean up expired tokens (can be called periodically)
   */
  static async cleanupExpiredTokens(): Promise<void> {
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from(TABLES.PASSWORD_RESET_TOKENS)
      .update({ used: true })
      .lt('expires_at', now)
      .eq('used', false);

    if (error) {
      console.error('Failed to cleanup expired tokens:', error);
    }
  }
}

