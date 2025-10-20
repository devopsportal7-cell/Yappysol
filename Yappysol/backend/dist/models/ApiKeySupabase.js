"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyModel = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("../lib/supabase");
class ApiKeyModel {
    static async createApiKey(data) {
        const id = (0, uuid_1.v4)();
        const apiKey = {
            id,
            user_id: data.userId,
            service: data.service,
            api_key: data.apiKey,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { error } = await supabase_1.supabase
            .from(supabase_1.TABLES.API_KEYS)
            .insert([apiKey]);
        if (error) {
            throw new Error(`Failed to create API key: ${error.message}`);
        }
        return apiKey;
    }
    static async findByUserId(userId) {
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.API_KEYS)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to find API keys: ${error.message}`);
        }
        return data || [];
    }
    static async findByUserIdAndService(userId, service) {
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.API_KEYS)
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
    static async updateApiKey(id, updates) {
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.API_KEYS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update API key: ${error.message}`);
        }
        return data;
    }
    static async deleteApiKey(id) {
        const { error } = await supabase_1.supabase
            .from(supabase_1.TABLES.API_KEYS)
            .delete()
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to delete API key: ${error.message}`);
        }
        return true;
    }
}
exports.ApiKeyModel = ApiKeyModel;
