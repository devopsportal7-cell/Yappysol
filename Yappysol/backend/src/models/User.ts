import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';
import { FileStorage } from '../utils/fileStorage';

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export class UserModel {
  private static users: FileStorage<User> = new FileStorage<User>('users');

  static async createUser(data: CreateUserData): Promise<User> {
    const id = uuidv4();
    const passwordHash = await bcrypt.hash(data.password, 12);
    
    const user: User = {
      id,
      email: data.email.toLowerCase(),
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(id, user);
    return user;
  }

  static async findByEmail(email: string): Promise<User | null> {
    const normalizedEmail = email.toLowerCase();
    for (const user of this.users.values()) {
      if (user.email === normalizedEmail) {
        return user;
      }
    }
    return null;
  }

  static async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  static async validatePassword(user: User, password: string): Promise<boolean> {
    return await bcrypt.compare(password, user.passwordHash);
  }

  static async updateUser(id: string, updates: Partial<Omit<User, 'id' | 'createdAt'>>): Promise<User | null> {
    const user = this.users.get(id);
    if (!user) return null;

    const updatedUser = { ...user, ...updates, updatedAt: new Date() };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
}
