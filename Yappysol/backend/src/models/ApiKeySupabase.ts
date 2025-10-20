import { v4 as uuidv4 } from 'uuid';
import { supabase, TABLES } from '../lib/supabase';

export interface ApiKey {
  id: string;
  user_id: string;
  service: 'pump' | 'bonk' | 'jupiter';
  api_key: string;
  created_at: string;
  updated_at: string;
}

export interface CreateApiKeyData {
  userId: string;
  service: 'pump' | 'bonk' | 'jupiter';
  apiKey: string;
}

export class ApiKeyModel {
  static async createApiKey(data: CreateApiKeyData): Promise<ApiKey> {
    const id = uuidv4();
    
    const apiKey: ApiKey = {
      id,
      user_id: data.userId,
      service: data.service,
      api_key: data.apiKey,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.API_KEYS)
      .insert([apiKey]);

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return apiKey;
  }

  static async findByUserId(userId: string): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from(TABLES.API_KEYS)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find API keys: ${error.message}`);
    }

    return data || [];
  }

  static async findByUserIdAndService(userId: string, service: 'pump' | 'bonk' | 'jupiter'): Promise<ApiKey | null> {
    const { data, error } = await supabase
      .from(TABLES.API_KEYS)
      .select('*')
      .eq('user_id', userId)
      .eq('service', service)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No API key found
      }
      throw new Error(`Failed to find API key: ${error.message}`);
    }

    return data;
  }

  static async updateApiKey(id: string, updates: Partial<Omit<ApiKey, 'id' | 'user_id' | 'created_at'>>): Promise<ApiKey | null> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.API_KEYS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }

    return data;
  }

  static async deleteApiKey(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.API_KEYS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete API key: ${error.message}`);
    }

    return true;
  }
}
