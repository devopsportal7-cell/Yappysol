import { Router, Request, Response } from 'express';
import trendingTokensService from '../services/trendingTokensService';

const router = Router();

// Get all trending tokens with details
router.get('/', async (_req: Request, res: Response) => {
    try {
        const tokens = await trendingTokensService.getTrendingTokensWithDetails();
        res.json({ prompt: tokens });
    } catch (error) {
        console.error('Error fetching trending tokens:', error);
        res.status(500).json({ prompt: 'Error fetching trending tokens' });
    }
});

// Update trending tokens list
router.post('/update', (req: Request, res: Response) => {
    try {
        const { tokens } = req.body;
        if (!Array.isArray(tokens)) {
            return res.status(400).json({ prompt: 'Invalid tokens format' });
        }
        const updatedTokens = trendingTokensService.updateTrendingTokens(tokens);
        res.json({ prompt: updatedTokens });
    } catch (error) {
        console.error('Error updating trending tokens:', error);
        res.status(500).json({ prompt: 'Error updating trending tokens' });
    }
});

export default router; 