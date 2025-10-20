"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const supabase_1 = require("../lib/supabase");
class UserModel {
    static async createUser(data) {
        const id = (0, uuid_1.v4)();
        const passwordHash = await bcrypt_1.default.hash(data.password, 12);
        const user = {
            id,
            email: data.email.toLowerCase(),
            password_hash: passwordHash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { error } = await supabase_1.supabase
            .from(supabase_1.TABLES.USERS)
            .insert([user]);
        if (error) {
            throw new Error(`Failed to create user: ${error.message}`);
        }
        return user;
    }
    static async findByEmail(email) {
        const normalizedEmail = email.toLowerCase();
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.USERS)
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
    static async findById(id) {
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.USERS)
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
    static async validatePassword(user, password) {
        return await bcrypt_1.default.compare(password, user.password_hash);
    }
    static async updateUser(id, updates) {
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.USERS)
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
exports.UserModel = UserModel;
