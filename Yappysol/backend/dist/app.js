"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const chat_1 = __importDefault(require("./routes/chat"));
const token_1 = __importDefault(require("./routes/token"));
const auth_1 = __importDefault(require("./routes/auth"));
const cors_1 = __importDefault(require("cors"));
const trendingTokens_1 = __importDefault(require("./routes/trendingTokens"));
const moralis_1 = require("./lib/moralis");
const heliusTest_1 = __importDefault(require("./routes/heliusTest"));
const transactions_1 = __importDefault(require("./routes/transactions"));
const portfolio_1 = __importDefault(require("./routes/portfolio"));
dotenv_1.default.config();
const app = (0, express_1.default)();
// Initialize Moralis
moralis_1.moralisService.initialize().catch(error => {
    console.error('Failed to initialize Moralis:', error);
    // Don't exit the process, just log the error
    // The service will handle uninitialized state
});
app.use(express_1.default.json());
const corsOrigin = process.env.FRONTEND_BASE_URL || 'http://localhost:3000';
app.use((0, cors_1.default)({
    origin: corsOrigin,
    credentials: true
}));
app.use('/api/auth', auth_1.default);
app.use('/api/chat', chat_1.default);
app.use('/api/token', token_1.default);
app.use('/api/trending-tokens', trendingTokens_1.default);
app.use('/api/helius-test', heliusTest_1.default);
app.use('/api/transactions', transactions_1.default);
app.use('/api/portfolio', portfolio_1.default);
exports.default = app;
