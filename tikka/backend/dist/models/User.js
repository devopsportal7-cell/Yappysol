"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserModel = void 0;
const uuid_1 = require("uuid");
const bcrypt_1 = __importDefault(require("bcrypt"));
const fileStorage_1 = require("../utils/fileStorage");
class UserModel {
    static async createUser(data) {
        const id = (0, uuid_1.v4)();
        const passwordHash = await bcrypt_1.default.hash(data.password, 12);
        const user = {
            id,
            email: data.email.toLowerCase(),
            passwordHash,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.users.set(id, user);
        return user;
    }
    static async findByEmail(email) {
        const normalizedEmail = email.toLowerCase();
        for (const user of this.users.values()) {
            if (user.email === normalizedEmail) {
                return user;
            }
        }
        return null;
    }
    static async findById(id) {
        return this.users.get(id) || null;
    }
    static async validatePassword(user, password) {
        return await bcrypt_1.default.compare(password, user.passwordHash);
    }
    static async updateUser(id, updates) {
        const user = this.users.get(id);
        if (!user)
            return null;
        const updatedUser = { ...user, ...updates, updatedAt: new Date() };
        this.users.set(id, updatedUser);
        return updatedUser;
    }
}
exports.UserModel = UserModel;
UserModel.users = new fileStorage_1.FileStorage('users');
