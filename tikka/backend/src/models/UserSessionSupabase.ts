import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { supabase, TABLES } from '../lib/supabase';

export interface UserSession {
  id: string;
  user_id: string;
  auth_type: 'jwt' | 'privy';
  privy_token_hash?: string; // Hashed Privy token for audit purposes
  internal_token_hash?: string; // Hashed internal JWT token
  device_info?: string; // Browser/device information
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  expires_at: string;
  last_accessed_at: string;
  is_active: boolean;
}

export interface CreateUserSessionData {
  userId: string;
  authType: 'jwt' | 'privy';
  privyToken?: string;
  internalToken?: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresInHours?: number;
}

export interface UpdateUserSessionData {
  lastAccessedAt?: string;
  isActive?: boolean;
  deviceInfo?: string;
}

export class UserSessionModel {
  private static readonly SESSION_DURATION_HOURS = 24; // Default session duration
  private static readonly PRIVY_TOKEN_DURATION_HOURS = 1; // Privy tokens are short-lived

  private static hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  static async createSession(data: CreateUserSessionData): Promise<UserSession> {
    const id = uuidv4();
    const now = new Date();
    
    // Determine session duration based on auth type
    const durationHours = data.authType === 'privy' 
      ? this.PRIVY_TOKEN_DURATION_HOURS 
      : data.expiresInHours || this.SESSION_DURATION_HOURS;
    
    const expiresAt = new Date(now.getTime() + (durationHours * 60 * 60 * 1000));

    const session: UserSession = {
      id,
      user_id: data.userId,
      auth_type: data.authType,
      privy_token_hash: data.privyToken ? this.hashToken(data.privyToken) : undefined,
      internal_token_hash: data.internalToken ? this.hashToken(data.internalToken) : undefined,
      device_info: data.deviceInfo,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      last_accessed_at: now.toISOString(),
      is_active: true
    };

    const { error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .insert([session]);

    if (error) {
      throw new Error(`Failed to create user session: ${error.message}`);
    }

    return session;
  }

  static async findByUserId(userId: string, activeOnly: boolean = true): Promise<UserSession[]> {
    let query = supabase
      .from(TABLES.USER_SESSIONS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (activeOnly) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to find user sessions: ${error.message}`);
    }

    return data || [];
  }

  static async findById(sessionId: string): Promise<UserSession | null> {
    const { data, error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .select('*')
      .eq('id', sessionId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No session found
      }
      throw new Error(`Failed to find user session: ${error.message}`);
    }

    return data;
  }

  static async findByInternalTokenHash(tokenHash: string): Promise<UserSession | null> {
    const { data, error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .select('*')
      .eq('internal_token_hash', tokenHash)
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No session found
      }
      throw new Error(`Failed to find session by token: ${error.message}`);
    }

    return data;
  }

  static async updateSession(sessionId: string, data: UpdateUserSessionData): Promise<UserSession | null> {
    const updateData = {
      ...data,
      last_accessed_at: data.lastAccessedAt || new Date().toISOString()
    };

    const { data: updatedSession, error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user session: ${error.message}`);
    }

    return updatedSession;
  }

  static async updateLastAccessed(sessionId: string): Promise<UserSession | null> {
    return this.updateSession(sessionId, {
      lastAccessedAt: new Date().toISOString()
    });
  }

  static async deactivateSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .update({ 
        is_active: false,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to deactivate session: ${error.message}`);
    }

    return true;
  }

  static async deactivateAllUserSessions(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .update({ 
        is_active: false,
        last_accessed_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to deactivate user sessions: ${error.message}`);
    }

    return true;
  }

  static async deleteExpiredSessions(): Promise<number> {
    const now = new Date().toISOString();
    
    const { data, error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .delete()
      .lt('expires_at', now)
      .select('id');

    if (error) {
      throw new Error(`Failed to delete expired sessions: ${error.message}`);
    }

    return data?.length || 0;
  }

  static async deleteSession(sessionId: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .delete()
      .eq('id', sessionId);

    if (error) {
      throw new Error(`Failed to delete user session: ${error.message}`);
    }

    return true;
  }

  static isSessionExpired(session: UserSession): boolean {
    return new Date(session.expires_at) < new Date();
  }

  static async cleanupExpiredSessions(): Promise<void> {
    // Deactivate expired sessions instead of deleting for audit purposes
    const now = new Date().toISOString();
    
    const { error } = await supabase
      .from(TABLES.USER_SESSIONS)
      .update({ 
        is_active: false,
        last_accessed_at: now
      })
      .lt('expires_at', now)
      .eq('is_active', true);

    if (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }
}


