"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const AuthService_1 = require("../services/AuthService");
const PrivyAuthService_1 = require("../services/PrivyAuthService");
const UserSessionSupabase_1 = require("../models/UserSessionSupabase");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const asyncHandler_1 = require("../utils/asyncHandler");
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
// Register endpoint
router.post('/register', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    const result = await AuthService_1.AuthService.register({ email, password });
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.status(201).json({
        message: 'User created successfully',
        user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username || null,
            onboardingCompleted: result.user.onboarding_completed || false,
            createdAt: result.user.created_at,
            solBalance: 0
        },
        token: result.token
    });
}));
// Login endpoint
router.post('/login', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }
    const result = await AuthService_1.AuthService.login({ email, password });
    if (!result.success) {
        return res.status(401).json({ error: result.error });
    }
    res.json({
        message: 'Login successful',
        user: {
            id: result.user.id,
            email: result.user.email,
            username: result.user.username || null,
            onboardingCompleted: result.user.onboarding_completed || false,
            createdAt: result.user.created_at,
            solBalance: 0
        },
        token: result.token
    });
}));
// Import wallet endpoint
router.post('/import-wallet', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const { privateKey } = req.body;
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    if (!privateKey) {
        return res.status(400).json({ error: 'Private key is required' });
    }
    const result = await AuthService_1.AuthService.importWallet(userId, privateKey);
    if (!result.success) {
        return res.status(400).json({ error: result.error });
    }
    res.json({
        message: 'Wallet imported successfully',
        wallet: {
            id: result.wallet.id,
            publicKey: result.wallet.public_key,
            isImported: result.wallet.is_imported
        }
    });
}));
// Get user wallets
router.get('/wallets', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    const wallets = await AuthService_1.AuthService.getUserWallets(userId);
    console.log('[AUTH] getUserWallets result:', JSON.stringify(wallets, null, 2));
    res.json({
        wallets: wallets.map(wallet => ({
            id: wallet.id,
            publicKey: wallet.publicKey,
            isImported: wallet.isImported,
            balance: wallet.balance
        }))
    });
}));
// Get user API keys
router.get('/api-keys', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    const userId = req.user?.id;
    if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
    }
    const apiKeys = await AuthService_1.AuthService.getUserApiKeys(userId);
    res.json({
        apiKeys: apiKeys.map(apiKey => ({
            id: apiKey.id,
            service: apiKey.service,
            createdAt: apiKey.created_at
        }))
    });
}));
// Privy authentication endpoint
router.post('/privy', (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        console.log('Backend: Received Privy auth request');
        console.log('Backend: Request body:', req.body);
        const { privyToken, privyUser } = req.body;
        if (!privyToken) {
            console.log('Backend: No Privy token provided');
            return res.status(400).json({
                success: false,
                error: 'Privy token required'
            });
        }
        console.log('Backend: Calling PrivyAuthService.verifyPrivyToken');
        const result = await PrivyAuthService_1.PrivyAuthService.verifyPrivyToken(privyToken, privyUser);
        console.log('Backend: PrivyAuthService result:', result);
        if (result.success) {
            console.log('Backend: Privy authentication successful');
            res.json({
                success: true,
                message: 'Privy authentication successful',
                user: {
                    id: result.user.id,
                    email: result.user.email,
                    username: result.user.username || null,
                    onboardingCompleted: result.user.onboarding_completed || false,
                    createdAt: result.user.created_at,
                    solBalance: 0
                },
                token: result.token
            });
        }
        else {
            console.log('Backend: Privy authentication failed:', result.error);
            res.status(401).json({
                success: false,
                error: result.error || 'Privy authentication failed'
            });
        }
    }
    catch (error) {
        console.error('Backend: Privy auth route error:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error during Privy authentication'
        });
    }
}));
// Verify token endpoint
router.get('/verify', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    res.json({
        valid: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            username: req.user.username || null,
            onboardingCompleted: req.user.onboarding_completed || false,
            createdAt: req.user.created_at,
            solBalance: 0
        }
    });
}));
// Logout endpoint
router.post('/logout', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (token) {
            // Deactivate the current session
            const tokenHash = crypto_1.default.createHash('sha256').update(token).digest('hex');
            const session = await UserSessionSupabase_1.UserSessionModel.findByInternalTokenHash(tokenHash);
            if (session) {
                await UserSessionSupabase_1.UserSessionModel.deactivateSession(session.id);
            }
        }
        res.json({
            message: 'Logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout error:', error);
        res.json({
            message: 'Logged out successfully'
        });
    }
}));
// Logout all sessions endpoint
router.post('/logout-all', authMiddleware_1.authMiddleware, (0, asyncHandler_1.asyncHandler)(async (req, res) => {
    try {
        if (req.user?.id) {
            await UserSessionSupabase_1.UserSessionModel.deactivateAllUserSessions(req.user.id);
        }
        res.json({
            message: 'All sessions logged out successfully'
        });
    }
    catch (error) {
        console.error('Logout all error:', error);
        res.status(500).json({
            error: 'Failed to logout all sessions'
        });
    }
}));
exports.default = router;
