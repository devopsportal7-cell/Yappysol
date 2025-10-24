import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { supabase, TABLES } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  password_hash: string;
  username?: string | null;
  onboarding_completed: boolean;
  username_set_at?: string | null;
  app_password_hash?: string | null; // For Privy users - app-specific password
  app_password_set_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateUserData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface UpdateUserProfileData {
  username?: string;
  onboardingCompleted?: boolean;
  appPassword?: string;
}

export class UserModel {
  static async createUser(data: CreateUserData): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
      username: null,
      onboarding_completed: false,
      username_set_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.USERS)
      .insert([user]);

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return user;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('email', normalizedEmail)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No user found
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data;
  }

  static async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No user found
      }
      throw new Error(`Failed to find user: ${error.message}`);
    }

    return data;
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.password_hash);
  }

  static async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'created_at'>>): Promise<User | null> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  static async findByUsername(username: string): Promise<User | null> {
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .select('*')
      .ilike('username', username.toLowerCase())
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No user found
      }
      throw new Error(`Failed to find user by username: ${error.message}`);
    }

    return data;
  }

  static async isUsernameAvailable(username: string, excludeUserId?: string): Promise<boolean> {
    const user = await this.findByUsername(username);
    if (!user) return true; // Username is available
    
    // If excludeUserId is provided, check if the found user is the same as excluded user
    if (excludeUserId && user.id === excludeUserId) {
      return true; // Username is available for this user (they can keep their current username)
    }
    
    return false; // Username is taken by someone else
  }

  static async updateUserProfile(id: string, updates: UpdateUserProfileData): Promise<User | null> {
    const updateData: any = {
      updated_at: new Date().toISOString()
    };

    if (updates.username !== undefined) {
      updateData.username = updates.username.toLowerCase();
      updateData.username_set_at = new Date().toISOString();
    }

    if (updates.onboardingCompleted !== undefined) {
      updateData.onboarding_completed = updates.onboardingCompleted;
    }

    if (updates.appPassword !== undefined) {
      updateData.app_password_hash = await bcrypt.hash(updates.appPassword, 12);
      updateData.app_password_set_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user profile: ${error.message}`);
    }

    return data;
  }

  static async validateAppPassword(user: User, password: string): Promise<boolean> {
    if (!user.app_password_hash) {
      return false;
    }
    return await bcrypt.compare(password, user.app_password_hash);
  }

  static async hasAppPassword(userId: string): Promise<boolean> {
    const user = await this.findById(userId);
    return user?.app_password_hash !== null && user?.app_password_hash !== undefined;
  }

  static async setAppPassword(userId: string, password: string): Promise<User | null> {
    const passwordHash = await bcrypt.hash(password, 12);
    
    const { data, error } = await supabase
      .from(TABLES.USERS)
      .update({
        app_password_hash: passwordHash,
        app_password_set_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to set app password: ${error.message}`);
    }

    return data;
  }
}
