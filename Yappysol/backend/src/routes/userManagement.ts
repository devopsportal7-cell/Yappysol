import { Router } from 'express';
import { PasswordController } from '../controllers/PasswordController';
import { WhitelistedAddressController } from '../controllers/WhitelistedAddressController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Password management routes
router.post('/password/set', authMiddleware, PasswordController.setPassword);
router.put('/password/update', authMiddleware, PasswordController.updatePassword);
router.post('/password/verify', authMiddleware, PasswordController.verifyPassword);
router.get('/password/status', authMiddleware, PasswordController.getPasswordStatus);
router.post('/password/validate', PasswordController.validatePassword);
router.post('/password/forgot', PasswordController.forgotPassword);
router.post('/password/reset', PasswordController.resetPassword);
router.get('/password/reset/verify/:token', PasswordController.verifyResetToken);

// Whitelisted addresses routes
router.get('/whitelisted-addresses', authMiddleware, WhitelistedAddressController.getAddresses);
router.post('/whitelisted-addresses', authMiddleware, WhitelistedAddressController.addAddress);
router.put('/whitelisted-addresses/:id', authMiddleware, WhitelistedAddressController.updateAddress);
router.delete('/whitelisted-addresses/:id', authMiddleware, WhitelistedAddressController.deleteAddress);
router.post('/whitelisted-addresses/check', authMiddleware, WhitelistedAddressController.checkAddress);

export default router;
