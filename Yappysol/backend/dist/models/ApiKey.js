"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiKeyModel = void 0;
const uuid_1 = require("uuid");
const fileStorage_1 = require("../utils/fileStorage");
class ApiKeyModel {
    static async createApiKey(data) {
        const id = (0, uuid_1.v4)();
        const apiKey = {
            id,
            userId: data.userId,
            service: data.service,
            apiKey: data.apiKey,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.apiKeys.set(id, apiKey);
        return apiKey;
    }
    static async findByUserId(userId) {
        const userApiKeys = [];
        for (const apiKey of this.apiKeys.values()) {
            if (apiKey.userId === userId) {
                userApiKeys.push(apiKey);
            }
        }
        return userApiKeys;
    }
    static async findByUserIdAndService(userId, service) {
        for (const apiKey of this.apiKeys.values()) {
            if (apiKey.userId === userId && apiKey.service === service) {
                return apiKey;
            }
        }
        return null;
    }
    static async findById(id) {
        return this.apiKeys.get(id) || null;
    }
    static async updateApiKey(id, updates) {
        const apiKey = this.apiKeys.get(id);
        if (!apiKey)
            return null;
        const updatedApiKey = { ...apiKey, ...updates, updatedAt: new Date() };
        this.apiKeys.set(id, updatedApiKey);
        return updatedApiKey;
    }
    static async deleteApiKey(id) {
        return this.apiKeys.delete(id);
    }
}
exports.ApiKeyModel = ApiKeyModel;
ApiKeyModel.apiKeys = new fileStorage_1.FileStorage('apiKeys');
