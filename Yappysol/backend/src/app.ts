import express from 'express';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';
import tokenRoutes from './routes/token';
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import userManagementRoutes from './routes/userManagement';
import tokenLaunchesRoutes from './routes/tokenLaunches';
import n8nRoutes from './routes/n8n';
import n8nS2SRoutes from './routes/n8n.s2s';
import cors from 'cors';
import trendingTokensRoutes from './routes/trendingTokens';
import { moralisService } from './lib/moralis';
import heliusTestRoute from './routes/heliusTest';
import transactionsRoutes from './routes/transactions';
import portfolioRoutes from './routes/portfolio';
import walletBalanceRoutes from './routes/walletBalance';
import activityRoutes from './routes/activity';

dotenv.config();

const app = express();

// Initialize Moralis
moralisService.initialize().catch(error => {
  console.error('Failed to initialize Moralis:', error);
  // Don't exit the process, just log the error
  // The service will handle uninitialized state
});

app.use(express.json());

// CORS configuration to support multiple origins
const corsOrigins = process.env.FRONTEND_BASE_URL?.split(',').map(url => url.trim()) || ['http://localhost:3000'];
console.log('CORS Origins configured:', corsOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (corsOrigins.includes(origin)) {
      console.log('CORS: Allowing origin:', origin);
      return callback(null, true);
    } else {
      console.log('CORS: Blocking origin:', origin);
      console.log('CORS: Allowed origins:', corsOrigins);
      return callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/user', userManagementRoutes);
app.use('/api/chat', tokenLaunchesRoutes);
app.use('/api/n8n', n8nRoutes);
app.use('/api/n8n', n8nS2SRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/trending-tokens', trendingTokensRoutes);
app.use('/api/helius-test', heliusTestRoute);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/wallet', walletBalanceRoutes);
app.use('/api/activity', activityRoutes);

// Initialize background services
const initializeServices = async () => {
  try {
    // Start background balance update service (if enabled)
    // Disabled by default to avoid rate limits - use WebSockets for real-time updates
    const enableBackgroundBalanceUpdate = process.env.ENABLE_BACKGROUND_UPDATES === 'true';
    if (enableBackgroundBalanceUpdate) {
      const { backgroundBalanceUpdateService } = await import('./services/BackgroundBalanceUpdateService');
      backgroundBalanceUpdateService.start();
      console.log('✅ Background balance update service started');
    } else {
      console.log('⏸️ Background balance update service disabled (ENABLE_BACKGROUND_UPDATES=false)');
    }

    // Initialize WebSocket subscriber for real-time transaction detection
    // Always enabled for transaction detection and balance updates
    try {
      const { websocketBalanceSubscriber } = await import('./services/WebsocketBalanceSubscriber');
      await websocketBalanceSubscriber.subscribeToAllUserWallets();
      console.log('✅ WebSocket balance subscriber initialized - Real-time transaction detection enabled');
    } catch (error) {
      console.error('❌ Error initializing WebSocket subscriber:', error);
      // Don't crash the app if WebSocket fails
    }

    // Note: Frontend WebSocket server is now attached in index.ts
    // This ensures it shares the same HTTP server on Render

    // Load platform wallets for external transaction detection
    const { externalTransactionService } = await import('./services/ExternalTransactionService');
    await externalTransactionService.loadPlatformWallets();
    console.log('✅ External transaction service initialized');

  } catch (error) {
    console.error('❌ Error initializing services:', error);
  }
};

// Initialize services after app setup
initializeServices();

export default app; 