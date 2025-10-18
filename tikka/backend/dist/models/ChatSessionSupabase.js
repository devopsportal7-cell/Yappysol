"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionModel = void 0;
const uuid_1 = require("uuid");
const supabase_1 = require("../lib/supabase");
class ChatSessionModel {
    static async createSession(data) {
        const id = (0, uuid_1.v4)();
        const session = {
            id,
            user_id: data.userId,
            title: data.title || 'New Chat',
            custom_title: data.customTitle,
            messages: [],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        const { error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .insert([session]);
        if (error) {
            throw new Error(`Failed to create chat session: ${error.message}`);
        }
        return session;
    }
    static async findByUserId(userId) {
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });
        if (error) {
            throw new Error(`Failed to find chat sessions: ${error.message}`);
        }
        return data || [];
    }
    static async findById(id) {
        const { data, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .select('*')
            .eq('id', id)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return null; // No session found
            }
            throw new Error(`Failed to find chat session: ${error.message}`);
        }
        return data;
    }
    static async updateSession(id, data) {
        const updateData = {
            ...data,
            updated_at: new Date().toISOString()
        };
        const { data: updatedSession, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .update(updateData)
            .eq('id', id)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to update chat session: ${error.message}`);
        }
        return updatedSession;
    }
    static async addMessage(sessionId, message) {
        // First get the current session
        const session = await this.findById(sessionId);
        if (!session) {
            throw new Error('Chat session not found');
        }
        // Add the new message
        const updatedMessages = [...session.messages, message];
        // Generate title if not custom
        const title = session.custom_title || this.generateTitle(updatedMessages);
        const updateData = {
            messages: updatedMessages,
            title,
            updated_at: new Date().toISOString()
        };
        const { data: updatedSession, error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .update(updateData)
            .eq('id', sessionId)
            .select()
            .single();
        if (error) {
            throw new Error(`Failed to add message: ${error.message}`);
        }
        return updatedSession;
    }
    static async deleteSession(id) {
        const { error } = await supabase_1.supabase
            .from(supabase_1.TABLES.CHAT_SESSIONS)
            .delete()
            .eq('id', id);
        if (error) {
            throw new Error(`Failed to delete chat session: ${error.message}`);
        }
        return true;
    }
    static generateTitle(messages) {
        if (messages.length === 0)
            return 'New Chat';
        const firstUserMessage = messages.find((m) => m.role === 'user');
        return firstUserMessage ? firstUserMessage.content.slice(0, 30) : 'Chat';
    }
}
exports.ChatSessionModel = ChatSessionModel;
