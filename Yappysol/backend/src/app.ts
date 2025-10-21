import express from 'express';
import dotenv from 'dotenv';
import chatRoutes from './routes/chat';
import tokenRoutes from './routes/token';
import authRoutes from './routes/auth';
import cors from 'cors';
import trendingTokensRoutes from './routes/trendingTokens';
import { moralisService } from './lib/moralis';
import heliusTestRoute from './routes/heliusTest';
import transactionsRoutes from './routes/transactions';
import portfolioRoutes from './routes/portfolio';

dotenv.config();

const app = express();

// Initialize Moralis
moralisService.initialize().catch(error => {
  console.error('Failed to initialize Moralis:', error);
  // Don't exit the process, just log the error
  // The service will handle uninitialized state
});

app.use(express.json());
const corsOrigins = process.env.FRONTEND_BASE_URL?.split(',') || ['http://localhost:3000'];
app.use(cors({
  origin: corsOrigins,
  credentials: true
}));

app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/token', tokenRoutes);
app.use('/api/trending-tokens', trendingTokensRoutes);
app.use('/api/helius-test', heliusTestRoute);
app.use('/api/transactions', transactionsRoutes);
app.use('/api/portfolio', portfolioRoutes);

export default app; 