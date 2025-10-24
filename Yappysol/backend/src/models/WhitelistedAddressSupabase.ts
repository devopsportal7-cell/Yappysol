import { v4 as uuidv4 } from 'uuid';
import { supabase, TABLES } from '../lib/supabase';

export interface WhitelistedAddress {
  id: string;
  user_id: string;
  address: string;
  label?: string | null; // Optional label like "My Main Wallet", "Exchange Wallet"
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateWhitelistedAddressData {
  userId: string;
  address: string;
  label?: string;
}

export interface UpdateWhitelistedAddressData {
  label?: string;
  isActive?: boolean;
}

export class WhitelistedAddressModel {
  static async create(data: CreateWhitelistedAddressData): Promise<WhitelistedAddress> {
    const id = uuidv4();
    
    const whitelistedAddress: WhitelistedAddress = {
      id,
      user_id: data.userId,
      address: data.address.toLowerCase().trim(),
      label: data.label || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .insert([whitelistedAddress]);

    if (error) {
      throw new Error(`Failed to create whitelisted address: ${error.message}`);
    }

    return whitelistedAddress;
  }

  static async findByUserId(userId: string): Promise<WhitelistedAddress[]> {
    const { data, error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch whitelisted addresses: ${error.message}`);
    }

    return data || [];
  }

  static async findById(id: string): Promise<WhitelistedAddress | null> {
    const { data, error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // No address found
      }
      throw new Error(`Failed to find whitelisted address: ${error.message}`);
    }

    return data;
  }

  static async update(id: string, updates: UpdateWhitelistedAddressData): Promise<WhitelistedAddress | null> {
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update whitelisted address: ${error.message}`);
    }

    return data;
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete whitelisted address: ${error.message}`);
    }
  }

  static async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .update({ 
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to deactivate whitelisted address: ${error.message}`);
    }
  }

  static async isAddressWhitelisted(userId: string, address: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(TABLES.WHITELISTED_ADDRESSES)
      .select('id')
      .eq('user_id', userId)
      .eq('address', address.toLowerCase().trim())
      .eq('is_active', true)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return false; // Address not whitelisted
      }
      throw new Error(`Failed to check whitelisted address: ${error.message}`);
    }

    return !!data;
  }

  static async validateAddress(address: string): Promise<boolean> {
    // Basic Solana address validation
    const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    return solanaAddressRegex.test(address);
  }
}
