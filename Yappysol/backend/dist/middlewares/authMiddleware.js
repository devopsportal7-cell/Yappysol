"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyAuthMiddleware = exports.authMiddleware = void 0;
const AuthService_1 = require("../services/AuthService");
const PrivyAuthService_1 = require("../services/PrivyAuthService");
const UserSupabase_1 = require("../models/UserSupabase");
const UserSessionSupabase_1 = require("../models/UserSessionSupabase");
const crypto_1 = __importDefault(require("crypto"));
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        // Try JWT authentication first
        let payload = AuthService_1.AuthService.verifyToken(token);
        let user;
        if (payload) {
            // Standard JWT authentication
            user = await UserSupabase_1.UserModel.findById(payload.userId);
            if (user) {
                // Update session last accessed time
                try {
                    const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
                    await UserSessionSupabase_1.UserSessionModel.updateLastAccessed((await UserSessionSupabase_1.UserSessionModel.findByInternalTokenHash(tokenHash))?.id || '');
                }
                catch (error) {
                    console.error('Failed to update session access time:', error);
                    // Don't fail authentication if session update fails
                }
                req.user = {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    onboarding_completed: user.onboarding_completed,
                    created_at: user.created_at,
                    authType: payload.authType || 'jwt'
                };
                next();
                return;
            }
        }
        // Try Privy authentication if JWT fails
        if (PrivyAuthService_1.PrivyAuthService.isPrivyConfigured()) {
            const privyResult = await PrivyAuthService_1.PrivyAuthService.verifyPrivyToken(token);
            if (privyResult.success && privyResult.user) {
                user = privyResult.user;
                payload = AuthService_1.AuthService.verifyToken(privyResult.token);
                if (user && payload) {
                    req.user = {
                        id: user.id,
                        email: user.email,
                        username: user.username,
                        onboarding_completed: user.onboarding_completed,
                        created_at: user.created_at,
                        authType: 'privy'
                    };
                    next();
                    return;
                }
            }
        }
        return res.status(401).json({ error: 'Invalid token' });
    }
    catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({ error: 'Authentication failed' });
    }
};
exports.authMiddleware = authMiddleware;
// Legacy middleware for backward compatibility
const legacyAuthMiddleware = (req, res, next) => {
    const walletAddress = req.headers['x-wallet-address'];
    if (!walletAddress) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    req.user = { wallet: walletAddress };
    next();
};
exports.legacyAuthMiddleware = legacyAuthMiddleware;
