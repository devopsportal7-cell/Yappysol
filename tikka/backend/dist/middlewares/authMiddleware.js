"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.legacyAuthMiddleware = exports.authMiddleware = void 0;
const AuthService_1 = require("../services/AuthService");
const UserSupabase_1 = require("../models/UserSupabase");
const authMiddleware = async (req, res, next) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const payload = AuthService_1.AuthService.verifyToken(token);
        if (!payload) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        const user = await UserSupabase_1.UserModel.findById(payload.userId);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }
        req.user = {
            id: user.id,
            email: user.email
        };
        next();
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
