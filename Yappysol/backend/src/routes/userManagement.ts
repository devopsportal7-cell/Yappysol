import { Router } from 'express';
import { PasswordController } from '../controllers/PasswordController';
import { WhitelistedAddressController } from '../controllers/WhitelistedAddressController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();

// Password management routes
router.post('/password/set', authMiddleware, PasswordController.setPassword);
router.put('/password/update', authMiddleware, PasswordController.updatePassword);
router.post('/password/verify', authMiddleware, PasswordController.verifyPassword);
router.get('/password/status', authMiddleware, PasswordController.getPasswordStatus);
router.post('/password/validate', PasswordController.validatePassword);
router.post('/password/forgot', PasswordController.forgotPassword);
router.post('/password/reset-request', PasswordController.forgotPassword); // Alias for frontend compatibility
router.post('/password/reset', PasswordController.resetPassword);
router.get('/password/reset/verify/:token', PasswordController.verifyResetToken);

// Whitelisted addresses routes
router.get('/whitelisted-addresses', authMiddleware, WhitelistedAddressController.getAddresses);
router.post('/whitelisted-addresses', authMiddleware, WhitelistedAddressController.addAddress);
router.put('/whitelisted-addresses/:id', authMiddleware, WhitelistedAddressController.updateAddress);
router.delete('/whitelisted-addresses/:id', authMiddleware, WhitelistedAddressController.deleteAddress);
router.post('/whitelisted-addresses/check', authMiddleware, WhitelistedAddressController.checkAddress);

// Private key management routes
router.get('/private-keys', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user!.id;
  
  try {
    // Get user's wallets
    const { WalletModel } = await import('../models/WalletSupabase');
    const wallets = await WalletModel.findByUserId(userId);
    
    if (!wallets || wallets.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'NO_WALLETS_FOUND',
        message: 'No wallets found for this user'
      });
    }

    // Return wallet information (without private keys for security)
    const walletInfo = wallets.map(wallet => ({
      id: wallet.id,
      publicKey: wallet.public_key,
      createdAt: wallet.created_at,
      isImported: wallet.is_imported
    }));

    res.json({
      success: true,
      wallets: walletInfo
    });

  } catch (error) {
    console.error('Error fetching wallets:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to fetch wallet information'
    });
  }
}));

router.post('/private-keys/export', authMiddleware, asyncHandler(async (req, res) => {
  const userId = (req as any).user!.id;
  const { walletId, password } = req.body;

  if (!walletId) {
    return res.status(400).json({
      success: false,
      error: 'WALLET_ID_REQUIRED',
      message: 'Wallet ID is required'
    });
  }

  if (!password) {
    return res.status(400).json({
      success: false,
      error: 'PASSWORD_REQUIRED',
      message: 'Password is required to export private keys'
    });
  }

  try {
    // Verify user's password first
    const { PasswordController } = await import('../controllers/PasswordController');
    const passwordValid = await PasswordController.verifyPasswordInternal(userId, password);
    
    if (!passwordValid) {
      return res.status(401).json({
        success: false,
        error: 'INVALID_PASSWORD',
        message: 'Invalid password'
      });
    }

    // Get the specific wallet
    const { WalletModel } = await import('../models/WalletSupabase');
    const wallet = await WalletModel.findById(walletId);
    
    if (!wallet) {
      return res.status(404).json({
        success: false,
        error: 'WALLET_NOT_FOUND',
        message: 'Wallet not found'
      });
    }

    // Verify wallet belongs to user
    if (wallet.user_id !== userId) {
      return res.status(403).json({
        success: false,
        error: 'ACCESS_DENIED',
        message: 'Access denied to this wallet'
      });
    }

    // Get the private key
    const privateKey = await WalletModel.getPrivateKey(walletId);

    res.json({
      success: true,
      wallet: {
        id: wallet.id,
        publicKey: wallet.public_key,
        privateKey: privateKey,
        createdAt: wallet.created_at
      },
      message: 'Private key exported successfully. Keep it secure!'
    });

  } catch (error) {
    console.error('Error exporting private key:', error);
    res.status(500).json({
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'Failed to export private key'
    });
  }
}));

export default router;
