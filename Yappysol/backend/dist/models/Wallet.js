"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WalletModel = void 0;
const uuid_1 = require("uuid");
const web3_js_1 = require("@solana/web3.js");
const bs58_1 = __importDefault(require("bs58"));
const crypto_1 = __importDefault(require("crypto"));
const fileStorage_1 = require("../utils/fileStorage");
class WalletModel {
    static encrypt(text) {
        const algorithm = 'aes-256-cbc';
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        const iv = crypto_1.default.randomBytes(16);
        const cipher = crypto_1.default.createCipheriv(algorithm, key, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        // Prepend IV to encrypted data
        return iv.toString('hex') + ':' + encrypted;
    }
    static decrypt(encryptedText) {
        const algorithm = 'aes-256-cbc';
        const key = crypto_1.default.scryptSync(this.encryptionKey, 'salt', 32);
        // Split IV and encrypted data
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        const decipher = crypto_1.default.createDecipheriv(algorithm, key, iv);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    static async createWallet(data) {
        const id = (0, uuid_1.v4)();
        const keypair = web3_js_1.Keypair.generate();
        const publicKey = keypair.publicKey.toString();
        const privateKey = bs58_1.default.encode(keypair.secretKey);
        const encryptedPrivateKey = this.encrypt(privateKey);
        const wallet = {
            id,
            userId: data.userId,
            publicKey,
            encryptedPrivateKey,
            isImported: data.isImported || false,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        this.wallets.set(id, wallet);
        return wallet;
    }
    static async importWallet(data) {
        const id = (0, uuid_1.v4)();
        // Validate the private key
        try {
            const keypair = web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(data.privateKey));
            const publicKey = keypair.publicKey.toString();
            const encryptedPrivateKey = this.encrypt(data.privateKey);
            const wallet = {
                id,
                userId: data.userId,
                publicKey,
                encryptedPrivateKey,
                isImported: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };
            this.wallets.set(id, wallet);
            return wallet;
        }
        catch (error) {
            throw new Error('Invalid private key format');
        }
    }
    static async findByUserId(userId) {
        const userWallets = [];
        for (const wallet of this.wallets.values()) {
            if (wallet.userId === userId) {
                userWallets.push(wallet);
            }
        }
        return userWallets;
    }
    static async findById(id) {
        return this.wallets.get(id) || null;
    }
    static async getPrivateKey(walletId) {
        const wallet = this.wallets.get(walletId);
        if (!wallet)
            throw new Error('Wallet not found');
        return this.decrypt(wallet.encryptedPrivateKey);
    }
    static async getKeypair(walletId) {
        const privateKey = await this.getPrivateKey(walletId);
        return web3_js_1.Keypair.fromSecretKey(bs58_1.default.decode(privateKey));
    }
}
exports.WalletModel = WalletModel;
WalletModel.wallets = new fileStorage_1.FileStorage('wallets');
WalletModel.encryptionKey = process.env.WALLET_ENCRYPTION_KEY || 'default-key-change-in-production';
