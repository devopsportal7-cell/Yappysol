import { Router } from 'express';
import axios from 'axios';
import config from '../config';

const router = Router();

// POST /api/helius-test
router.post('/', async (req, res) => {
  const { mint } = req.body;
  if (!mint) {
    return res.status(400).json({ error: 'Missing mint address in body' });
  }
  try {
    const response = await axios.post(
      `https://api.helius.xyz/v0/token-metadata?api-key=${config.HELIUS_API_KEY}`,
      {
        mintAccounts: [mint],
        includeOffChain: false,
        disableCache: false
      },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error?.toString() });
  }
});

export default router; 