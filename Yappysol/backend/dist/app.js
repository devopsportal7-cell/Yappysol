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
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const chat_1 = __importDefault(require("./routes/chat"));
const token_1 = __importDefault(require("./routes/token"));
const auth_1 = __importDefault(require("./routes/auth"));
const user_1 = __importDefault(require("./routes/user"));
const userManagement_1 = __importDefault(require("./routes/userManagement"));
const tokenLaunches_1 = __importDefault(require("./routes/tokenLaunches"));
const n8n_1 = __importDefault(require("./routes/n8n"));
const n8n_s2s_1 = __importDefault(require("./routes/n8n.s2s"));
const cors_1 = __importDefault(require("cors"));
const trendingTokens_1 = __importDefault(require("./routes/trendingTokens"));
const moralis_1 = require("./lib/moralis");
const heliusTest_1 = __importDefault(require("./routes/heliusTest"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
const walletBalance_1 = __importDefault(require("./routes/walletBalance"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Initialize Moralis
moralis_1.moralisService.initialize().catch(error => {
    console.error('Failed to initialize Moralis:', error);
    // Don't exit the process, just log the error
    // The service will handle uninitialized state
});
app.use(express_1.default.json());
// CORS configuration to support multiple origins
const corsOrigins = process.env.FRONTEND_BASE_URL?.split(',').map(url => url.trim()) || ['http://localhost:3000'];
console.log('CORS Origins configured:', corsOrigins);
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin)
            return callback(null, true);
        if (corsOrigins.includes(origin)) {
            console.log('CORS: Allowing origin:', origin);
            return callback(null, true);
        }
        else {
            console.log('CORS: Blocking origin:', origin);
            console.log('CORS: Allowed origins:', corsOrigins);
            return callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use('/api/auth', auth_1.default);
app.use('/api/user', user_1.default);
app.use('/api/user', userManagement_1.default);
app.use('/api/chat', tokenLaunches_1.default);
app.use('/api/n8n', n8n_1.default);
app.use('/api/n8n', n8n_s2s_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/token', token_1.default);
app.use('/api/trending-tokens', trendingTokens_1.default);
app.use('/api/helius-test', heliusTest_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/portfolio', portfolio_1.default);
app.use('/api/wallet', walletBalance_1.default);
// Initialize background services
const initializeServices = async () => {
    try {
        // Start background balance update service (if enabled)
        // Disabled by default to avoid rate limits - use WebSockets for real-time updates
        const enableBackgroundBalanceUpdate = process.env.ENABLE_BACKGROUND_UPDATES === 'true';
        if (enableBackgroundBalanceUpdate) {
            const { backgroundBalanceUpdateService } = await Promise.resolve().then(() => __importStar(require('./services/BackgroundBalanceUpdateService')));
            backgroundBalanceUpdateService.start();
            console.log('✅ Background balance update service started');
        }
        else {
            console.log('⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)');
        }
        // Initialize WebSocket subscriber
        const { websocketBalanceSubscriber } = await Promise.resolve().then(() => __importStar(require('./services/WebsocketBalanceSubscriber')));
        await websocketBalanceSubscriber.subscribeToAllUserWallets();
        console.log('✅ WebSocket balance subscriber initialized');
        // Note: Frontend WebSocket server is now attached in index.ts
        // This ensures it shares the same HTTP server on Render
        // Load platform wallets for external transaction detection
        const { externalTransactionService } = await Promise.resolve().then(() => __importStar(require('./services/ExternalTransactionService')));
        await externalTransactionService.loadPlatformWallets();
        console.log('✅ External transaction service initialized');
    }
    catch (error) {
        console.error('❌ Error initializing services:', error);
    }
};
// Initialize services after app setup
initializeServices();
exports.default = app;
