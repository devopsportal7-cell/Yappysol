import { Router } from 'express';
import { TokenLaunchModel } from '../models/TokenLaunchSupabase';
import { tokenPriceTrackingService } from '../services/TokenPriceTrackingService';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Get all token launches for a user
router.get('/launches', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const launches = await TokenLaunchModel.findByUserId(userId, limit);
    res.json({ launches });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching launches:', error);
    res.status(500).json({ error: 'Failed to fetch token launches' });
  }
}));

// Get a specific token launch
router.get('/launches/:id', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launch = await TokenLaunchModel.findById(req.params.id);
    if (!launch || launch.user_id !== userId) {
      return res.status(404).json({ error: 'Token launch not found' });
    }
    res.json({ launch });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching launch:', error);
    res.status(500).json({ error: 'Failed to fetch token launch' });
  }
}));

// Get launch statistics for a user
router.get('/launches/stats', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const stats = await TokenLaunchModel.getLaunchStats(userId);
    res.json({ stats });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching launch stats:', error);
    res.status(500).json({ error: 'Failed to fetch launch statistics' });
  }
}));

// Get top performing launches
router.get('/launches/top-performers', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const performers = await TokenLaunchModel.getTopPerformers(userId, limit);
    res.json({ performers });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching top performers:', error);
    res.status(500).json({ error: 'Failed to fetch top performers' });
  }
}));

// Get recent launches
router.get('/launches/recent', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const recent = await TokenLaunchModel.getRecentLaunches(userId, limit);
    res.json({ launches: recent });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching recent launches:', error);
    res.status(500).json({ error: 'Failed to fetch recent launches' });
  }
}));

// Get price history for a token launch
router.get('/launches/:id/price-history', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launch = await TokenLaunchModel.findById(req.params.id);
    if (!launch || launch.user_id !== userId) {
      return res.status(404).json({ error: 'Token launch not found' });
    }

    const days = parseInt(req.query.days as string) || 7;
    const priceHistory = await TokenLaunchModel.getPriceHistory(req.params.id, days);
    res.json({ priceHistory });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching price history:', error);
    res.status(500).json({ error: 'Failed to fetch price history' });
  }
}));

// Update a token launch (for manual updates)
router.put('/launches/:id', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launch = await TokenLaunchModel.findById(req.params.id);
    if (!launch || launch.user_id !== userId) {
      return res.status(404).json({ error: 'Token launch not found' });
    }

    const updates = req.body;
    const updatedLaunch = await TokenLaunchModel.updateLaunch(req.params.id, updates);
    res.json({ launch: updatedLaunch });
  } catch (error) {
    console.error('[LAUNCHES] Error updating launch:', error);
    res.status(500).json({ error: 'Failed to update token launch' });
  }
}));

// Delete a token launch
router.delete('/launches/:id', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const launch = await TokenLaunchModel.findById(req.params.id);
    if (!launch || launch.user_id !== userId) {
      return res.status(404).json({ error: 'Token launch not found' });
    }

    await TokenLaunchModel.deleteLaunch(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('[LAUNCHES] Error deleting launch:', error);
    res.status(500).json({ error: 'Failed to delete token launch' });
  }
}));

// Get user's token holdings (portfolio integration)
router.get('/holdings', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const holdings = await TokenLaunchModel.getUserHoldings(userId);
    res.json({ holdings });
  } catch (error) {
    console.error('[LAUNCHES] Error fetching holdings:', error);
    res.status(500).json({ error: 'Failed to fetch token holdings' });
  }
}));

// Get portfolio value
router.get('/portfolio/value', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    const portfolio = await TokenLaunchModel.getPortfolioValue(userId);
    res.json(portfolio);
  } catch (error) {
    console.error('[LAUNCHES] Error fetching portfolio value:', error);
    res.status(500).json({ error: 'Failed to fetch portfolio value' });
  }
}));

// Update token prices (manual trigger)
router.post('/launches/update-prices', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    await tokenPriceTrackingService.updateTokenPrices();
    res.json({ success: true, message: 'Price update initiated' });
  } catch (error) {
    console.error('[LAUNCHES] Error updating prices:', error);
    res.status(500).json({ error: 'Failed to update token prices' });
  }
}));

// Update user holdings (manual trigger)
router.post('/holdings/update', authMiddleware, asyncHandler(async (req, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ error: 'User not authenticated' });
  }

  try {
    await tokenPriceTrackingService.updateUserHoldings(userId);
    res.json({ success: true, message: 'Holdings update initiated' });
  } catch (error) {
    console.error('[LAUNCHES] Error updating holdings:', error);
    res.status(500).json({ error: 'Failed to update holdings' });
  }
}));

export default router;

