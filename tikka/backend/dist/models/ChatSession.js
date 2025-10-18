"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatSessionModel = void 0;
const uuid_1 = require("uuid");
const fileStorage_1 = require("../utils/fileStorage");
class ChatSessionModel {
    static async createSession(data) {
        const id = (0, uuid_1.v4)();
        const session = {
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
    static async findByUserId(userId) {
        const userSessions = [];
        for (const session of this.sessions.values()) {
            if (session.userId === userId) {
                userSessions.push(session);
            }
        }
        // Sort by updatedAt descending (most recent first)
        return userSessions.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    }
    static async findById(id) {
        return this.sessions.get(id) || null;
    }
    static async updateSession(id, data) {
        const session = this.sessions.get(id);
        if (!session)
            return null;
        const updatedSession = {
            ...session,
            ...data,
            updatedAt: new Date()
        };
        this.sessions.set(id, updatedSession);
        return updatedSession;
    }
    static async addMessage(sessionId, message) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return null;
        const updatedSession = {
            ...session,
            messages: [...session.messages, message],
            title: session.customTitle || this.generateTitle([...session.messages, message]),
            updatedAt: new Date()
        };
        this.sessions.set(sessionId, updatedSession);
        return updatedSession;
    }
    static async deleteSession(id) {
        return this.sessions.delete(id);
    }
    static generateTitle(messages) {
        if (messages.length === 0)
            return 'New Chat';
        const firstUserMessage = messages.find((m) => m.role === 'user');
        return firstUserMessage ? firstUserMessage.content.slice(0, 30) : 'Chat';
    }
}
exports.ChatSessionModel = ChatSessionModel;
ChatSessionModel.sessions = new fileStorage_1.FileStorage('chatSessions');
