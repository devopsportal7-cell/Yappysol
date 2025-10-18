import { v4 as uuidv4 } from 'uuid';
import { FileStorage } from '../utils/fileStorage';

export interface ApiKey {
  id: string;
  userId: string;
  service: 'pump' | 'bonk' | 'jupiter';
  apiKey: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateApiKeyData {
  userId: string;
  service: 'pump' | 'bonk' | 'jupiter';
  apiKey: string;
}

export class ApiKeyModel {
  private static apiKeys: FileStorage<ApiKey> = new FileStorage<ApiKey>('apiKeys');

  static async createApiKey(data: CreateApiKeyData): Promise<ApiKey> {
    const id = uuidv4();
    
    const apiKey: ApiKey = {
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

  static async findByUserId(userId: string): Promise<ApiKey[]> {
    const userApiKeys: ApiKey[] = [];
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.userId === userId) {
        userApiKeys.push(apiKey);
      }
    }
    return userApiKeys;
  }

  static async findByUserIdAndService(userId: string, service: 'pump' | 'bonk' | 'jupiter'): Promise<ApiKey | null> {
    for (const apiKey of this.apiKeys.values()) {
      if (apiKey.userId === userId && apiKey.service === service) {
        return apiKey;
      }
    }
    return null;
  }

  static async findById(id: string): Promise<ApiKey | null> {
    return this.apiKeys.get(id) || null;
  }

  static async updateApiKey(id: string, updates: Partial<Omit<ApiKey, 'id' | 'createdAt'>>): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(id);
    if (!apiKey) return null;

    const updatedApiKey = { ...apiKey, ...updates, updatedAt: new Date() };
    this.apiKeys.set(id, updatedApiKey);
    return updatedApiKey;
  }

  static async deleteApiKey(id: string): Promise<boolean> {
    return this.apiKeys.delete(id);
  }
}
