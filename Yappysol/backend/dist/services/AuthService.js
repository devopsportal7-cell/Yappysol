"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const UserSupabase_1 = require("../models/UserSupabase");
const WalletSupabase_1 = require("../models/WalletSupabase");
const ApiKeySupabase_1 = require("../models/ApiKeySupabase");
const UserSessionSupabase_1 = require("../models/UserSessionSupabase");
const WalletService_1 = require("./WalletService");
const PrivyAuthService_1 = require("./PrivyAuthService");
class AuthService {
    static async register(data) {
        try {
            // Check if user already exists
            const existingUser = await UserSupabase_1.UserModel.findByEmail(data.email);
            if (existingUser) {
                return {
                    success: false,
                    error: 'User with this email already exists'
                };
            }
            // Create user
            const user = await UserSupabase_1.UserModel.createUser(data);
            // Create default wallet
            const wallet = await WalletSupabase_1.WalletModel.createWallet({
                userId: user.id,
                isImported: false
            });
            // Generate API key for Pump.fun (placeholder - you'll need to integrate with actual API)
            const pumpApiKey = await this.generatePumpApiKey();
            await ApiKeySupabase_1.ApiKeyModel.createApiKey({
                userId: user.id,
                service: 'pump',
                apiKey: pumpApiKey
            });
            // Generate JWT token
            const token = this.generateToken(user);
            // Create user session for tracking
            try {
                await UserSessionSupabase_1.UserSessionModel.createSession({
                    userId: user.id,
                    authType: 'jwt',
                    internalToken: token,
                    deviceInfo: 'web-browser', // Could be enhanced with actual device info
                    ipAddress: 'unknown', // Could be enhanced with actual IP
                    userAgent: 'unknown' // Could be enhanced with actual user agent
                });
            }
            catch (error) {
                console.error('Failed to create JWT session during registration:', error);
                // Don't fail authentication if session creation fails
            }
            return {
                success: true,
                user,
                token
            };
        }
        catch (error) {
            console.error('Registration error:', error);
            return {
                success: false,
                error: 'Registration failed. Please try again.'
            };
        }
    }
    static async login(data) {
        try {
            const user = await UserSupabase_1.UserModel.findByEmail(data.email);
            if (!user) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            const isValidPassword = await UserSupabase_1.UserModel.validatePassword(user, data.password);
            if (!isValidPassword) {
                return {
                    success: false,
                    error: 'Invalid email or password'
                };
            }
            const token = this.generateToken(user);
            // Create user session for tracking
            try {
                await UserSessionSupabase_1.UserSessionModel.createSession({
                    userId: user.id,
                    authType: 'jwt',
                    internalToken: token,
                    deviceInfo: 'web-browser', // Could be enhanced with actual device info
                    ipAddress: 'unknown', // Could be enhanced with actual IP
                    userAgent: 'unknown' // Could be enhanced with actual user agent
                });
            }
            catch (error) {
                console.error('Failed to create JWT session:', error);
                // Don't fail authentication if session creation fails
            }
            // Get user wallets and portfolio data
            let wallets = [];
            let portfolio = null;
            try {
                // Get user wallets with balances
                wallets = await WalletService_1.WalletService.getUserWallets(user.id);
                // Get portfolio data for the first wallet (if available)
                if (wallets.length > 0) {
                    const { UserPortfolioService } = await Promise.resolve().then(() => __importStar(require('./UserPortfolioService')));
                    const portfolioService = new UserPortfolioService();
                    portfolio = await portfolioService.getUserPortfolioWithMetadata(wallets[0].publicKey);
                }
            }
            catch (error) {
                console.error('Error fetching wallet/portfolio data during login:', error);
                // Don't fail login if portfolio fetch fails
            }
            return {
                success: true,
                user: {
                    ...user,
                    wallets,
                    portfolio
                },
                token
            };
        }
        catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: 'Login failed. Please try again.'
            };
        }
    }
    static async importWallet(userId, privateKey) {
        try {
            const wallet = await WalletSupabase_1.WalletModel.importWallet({
                userId,
                privateKey
            });
            return {
                success: true,
                wallet
            };
        }
        catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to import wallet'
            };
        }
    }
    static async getUserWallets(userId) {
        return await WalletService_1.WalletService.getUserWallets(userId);
    }
    static async getUserApiKeys(userId) {
        return await ApiKeySupabase_1.ApiKeyModel.findByUserId(userId);
    }
    static async authenticateWithPrivy(privyToken) {
        try {
            const result = await PrivyAuthService_1.PrivyAuthService.verifyPrivyToken(privyToken);
            return result;
        }
        catch (error) {
            console.error('Privy authentication error:', error);
            return {
                success: false,
                error: 'Privy authentication failed'
            };
        }
    }
    static verifyToken(token) {
        try {
            return jsonwebtoken_1.default.verify(token, this.JWT_SECRET);
        }
        catch (error) {
            return null;
        }
    }
    static generateToken(user) {
        return jsonwebtoken_1.default.sign({
            userId: user.id,
            email: user.email,
            authType: 'jwt'
        }, this.JWT_SECRET, { expiresIn: this.JWT_EXPIRES_IN });
    }
    static async generatePumpApiKey() {
        // This is a placeholder - you'll need to integrate with actual Pump.fun API
        // to generate real API keys
        return `pump_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    }
}
exports.AuthService = AuthService;
AuthService.JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
AuthService.JWT_EXPIRES_IN = '7d';
