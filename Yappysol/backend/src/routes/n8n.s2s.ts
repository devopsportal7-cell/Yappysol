import express, { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { LaunchController } from '../controllers/LaunchController';
import { SwapController } from '../controllers/SwapController';
import { PortfolioController } from '../controllers/PortfolioController';
import { TxController } from '../controllers/TxController';
import { PriceController } from '../controllers/PriceController';
import { TrendingController } from '../controllers/TrendingController';

const router = express.Router();

// Server-to-server authentication middleware for n8n
const serverAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization as string;
  const serverKey = process.env.BACKEND_SERVER_KEY;
  
  if (!serverKey) {
    return res.status(500).json({ error: 'Server authentication not configured' });
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  
  const token = authHeader.substring(7); // Remove 'Bearer ' prefix
  
  if (token !== serverKey) {
    return res.status(401).json({ error: 'Invalid server key' });
  }
  
  next();
};

// Apply server authentication to all routes
router.use(serverAuthMiddleware);

// Launch endpoints
router.post('/chain/launch/init', asyncHandler(LaunchController.init));

// Swap endpoints
router.post('/chain/swap/resolve', asyncHandler(SwapController.resolve));
router.post('/chain/swap/quote', asyncHandler(SwapController.quote));
router.post('/chain/swap/init', asyncHandler(SwapController.init));

// Portfolio endpoints
router.post('/portfolio/view', asyncHandler(PortfolioController.view));

// Transaction endpoints
router.post('/tx/lookup', asyncHandler(TxController.lookup));

// Price endpoints
router.post('/price/quote', asyncHandler(PriceController.quote));

// Trending endpoints
router.post('/trending/list', asyncHandler(TrendingController.list));

export default router;
