import { v4 as uuidv4 } from 'uuid';
import { supabase, TABLES } from '../lib/supabase';

export interface ChatMessage {
  id: string;
  content: string;
  role: string;
  attachments?: any[];
  action?: string;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  custom_title?: string;
  messages: ChatMessage[];
  created_at: string;
  updated_at: string;
}

export interface CreateChatSessionData {
  userId: string;
  title?: string;
  customTitle?: string;
}

export interface UpdateChatSessionData {
  title?: string;
  customTitle?: string;
  messages?: ChatMessage[];
}

export class ChatSessionModel {
  static async createSession(data: CreateChatSessionData): Promise<ChatSession> {
    const id = uuidv4();
    const session: ChatSession = {
      id,
      user_id: data.userId,
      title: data.title || 'New Chat',
      custom_title: data.customTitle,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
      .insert([session]);

    if (error) {
      throw new Error(`Failed to create chat session: ${error.message}`);
    }

    return session;
  }

  static async findByUserId(userId: string): Promise<ChatSession[]> {
    const { data, error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to find chat sessions: ${error.message}`);
    }

    return data || [];
  }

  static async findById(id: string): Promise<ChatSession | null> {
    const { data, error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
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

  static async updateSession(id: string, data: UpdateChatSessionData): Promise<ChatSession | null> {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString()
    };

    const { data: updatedSession, error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update chat session: ${error.message}`);
    }

    return updatedSession;
  }

  static async addMessage(sessionId: string, message: ChatMessage): Promise<ChatSession | null> {
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

    const { data: updatedSession, error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
      .update(updateData)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add message: ${error.message}`);
    }

    return updatedSession;
  }

  static async deleteSession(id: string): Promise<boolean> {
    const { error } = await supabase
      .from(TABLES.CHAT_SESSIONS)
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete chat session: ${error.message}`);
    }

    return true;
  }

  private static generateTitle(messages: ChatMessage[]): string {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find((m) => m.role === 'user');
    return firstUserMessage ? firstUserMessage.content.slice(0, 30) : 'Chat';
  }
}
