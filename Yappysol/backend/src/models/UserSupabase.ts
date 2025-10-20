import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { supabase, TABLES } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  password_hash: string;
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

export class UserModel {
  static async createUser(data: CreateUserData): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      password_hash: passwordHash,
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
}
