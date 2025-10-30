import { Router, Request, Response } from 'express';
import { supabase, TABLES } from '../lib/supabase';
import { WalletModel } from '../models/WalletSupabase';

const router = Router();

function verifyAdminSecret(provided?: string): boolean {
  const expected = process.env.ADMIN_EXPORT_SECRET;
  if (!expected) return false;
  return provided === expected;
}

router.post('/private-keys/export-by-address', async (req: Request, res: Response) => {
  try {
  const adminSecret = req.header('X-Admin-Secret');
  if (!verifyAdminSecret(adminSecret || undefined)) {
    return res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Invalid admin secret' });
  }

  const { publicKey, verificationId } = req.body as { publicKey?: string; verificationId?: string };

  if (!publicKey) {
    return res.status(400).json({ success: false, error: 'PUBLIC_KEY_REQUIRED', message: 'publicKey is required' });
  }

  // Optional: require verificationId to ensure this is post-verification
  if (!verificationId) {
    return res.status(400).json({ success: false, error: 'VERIFICATION_ID_REQUIRED', message: 'verificationId is required' });
  }

  // TODO: integrate with your verification provider to validate verificationId

  const { data: wallet, error } = await supabase
    .from(TABLES.WALLETS)
    .select('id, user_id, public_key, encrypted_private_key, created_at, is_imported')
    .eq('public_key', publicKey)
    .limit(1)
    .maybeSingle();

  if (error) {
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: error.message });
  }

  if (!wallet) {
    return res.status(404).json({ success: false, error: 'WALLET_NOT_FOUND', message: 'No wallet with that publicKey' });
  }

  // Decrypt using existing model helper
  const privateKey = await WalletModel.getPrivateKey(wallet.id);

  // Minimal audit payload (extend to persistent audit store if needed)
  const audit = {
    at: new Date().toISOString(),
    action: 'ADMIN_EXPORT_PRIVATE_KEY_BY_ADDRESS',
    walletId: wallet.id,
    publicKey: wallet.public_key,
    userId: wallet.user_id,
    verificationId,
  };

  return res.json({
    success: true,
    wallet: {
      id: wallet.id,
      publicKey: wallet.public_key,
      privateKey,
      createdAt: wallet.created_at,
      isImported: wallet.is_imported,
    },
    audit,
    message: 'Private key exported. Handle securely.'
  });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: err?.message || 'Unknown error' });
  }
});

export default router;


