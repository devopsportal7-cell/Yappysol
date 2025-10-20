import { v4 as uuidv4 } from 'uuid';
import { FileStorage } from '../utils/fileStorage';

export interface ChatMessage {
  id: string;
  content: string;
  role: string;
  attachments?: any[];
  action?: string;
  createdAt: Date;
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  customTitle?: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
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
  private static sessions: FileStorage<ChatSession> = new FileStorage<ChatSession>('chatSessions');

  static async createSession(data: CreateChatSessionData): Promise<ChatSession> {
    const id = uuidv4();
    const session: ChatSession = {
      id,
      userId: data.userId,
      title: data.title || 'New Chat',
      customTitle: data.customTitle,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(id, session);
    return session;
  }

  static async findByUserId(userId: string): Promise<ChatSession[]> {
    const userSessions: ChatSession[] = [];
    for (const session of this.sessions.values()) {
      if (session.userId === userId) {
        userSessions.push(session);
      }
    }
    // Sort by updatedAt descending (most recent first)
    return userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  }

  static async findById(id: string): Promise<ChatSession | null> {
    return this.sessions.get(id) || null;
  }

  static async updateSession(id: string, data: UpdateChatSessionData): Promise<ChatSession | null> {
    const session = this.sessions.get(id);
    if (!session) return null;

    const updatedSession = {
      ...session,
      ...data,
      updatedAt: new Date()
    };

    this.sessions.set(id, updatedSession);
    return updatedSession;
  }

  static async addMessage(sessionId: string, message: ChatMessage): Promise<ChatSession | null> {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const updatedSession = {
      ...session,
      messages: [...session.messages, message],
      title: session.customTitle || this.generateTitle([...session.messages, message]),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, updatedSession);
    return updatedSession;
  }

  static async deleteSession(id: string): Promise<boolean> {
    return this.sessions.delete(id);
  }

  private static generateTitle(messages: ChatMessage[]): string {
    if (messages.length === 0) return 'New Chat';
    const firstUserMessage = messages.find((m) => m.role === 'user');
    return firstUserMessage ? firstUserMessage.content.slice(0, 30) : 'Chat';
  }
}
