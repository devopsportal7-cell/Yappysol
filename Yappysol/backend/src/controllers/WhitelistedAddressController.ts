import { Request, Response } from 'express';
import { WhitelistedAddressModel } from '../models/WhitelistedAddressSupabase';

export class WhitelistedAddressController {
  /**
   * Get all whitelisted addresses for the user
   * GET /api/user/whitelisted-addresses
   */
  static async getAddresses(req: Request, res: Response) {
    try {
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const addresses = await WhitelistedAddressModel.findByUserId(userId);

      res.json({
        success: true,
        addresses,
        count: addresses.length,
        message: `Found ${addresses.length} whitelisted addresses`
      });

    } catch (error) {
      console.error('[WhitelistedAddressController] Get addresses error:', error);
      res.status(500).json({
        error: 'Failed to fetch whitelisted addresses',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Add a new whitelisted address
   * POST /api/user/whitelisted-addresses
   */
  static async addAddress(req: Request, res: Response) {
    try {
      const { address, label } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      // Validate address format
      const isValidAddress = await WhitelistedAddressModel.validateAddress(address);
      if (!isValidAddress) {
        return res.status(400).json({ 
          error: 'Invalid Solana address format' 
        });
      }

      // Check if address is already whitelisted
      const isAlreadyWhitelisted = await WhitelistedAddressModel.isAddressWhitelisted(userId, address);
      if (isAlreadyWhitelisted) {
        return res.status(400).json({ 
          error: 'Address is already whitelisted' 
        });
      }

      // Create the whitelisted address
      const whitelistedAddress = await WhitelistedAddressModel.create({
        userId,
        address,
        label
      });

      res.status(201).json({
        success: true,
        address: whitelistedAddress,
        message: 'Address added to whitelist successfully'
      });

    } catch (error) {
      console.error('[WhitelistedAddressController] Add address error:', error);
      res.status(500).json({
        error: 'Failed to add whitelisted address',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a whitelisted address
   * PUT /api/user/whitelisted-addresses/:id
   */
  static async updateAddress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { label, isActive } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Address ID is required' });
      }

      // Check if address exists and belongs to user
      const existingAddress = await WhitelistedAddressModel.findById(id);
      if (!existingAddress) {
        return res.status(404).json({ error: 'Whitelisted address not found' });
      }

      if (existingAddress.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update the address
      const updatedAddress = await WhitelistedAddressModel.update(id, {
        label,
        isActive
      });

      res.json({
        success: true,
        address: updatedAddress,
        message: 'Whitelisted address updated successfully'
      });

    } catch (error) {
      console.error('[WhitelistedAddressController] Update address error:', error);
      res.status(500).json({
        error: 'Failed to update whitelisted address',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete a whitelisted address
   * DELETE /api/user/whitelisted-addresses/:id
   */
  static async deleteAddress(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!id) {
        return res.status(400).json({ error: 'Address ID is required' });
      }

      // Check if address exists and belongs to user
      const existingAddress = await WhitelistedAddressModel.findById(id);
      if (!existingAddress) {
        return res.status(404).json({ error: 'Whitelisted address not found' });
      }

      if (existingAddress.user_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Delete the address (soft delete)
      await WhitelistedAddressModel.softDelete(id);

      res.json({
        success: true,
        message: 'Whitelisted address deleted successfully'
      });

    } catch (error) {
      console.error('[WhitelistedAddressController] Delete address error:', error);
      res.status(500).json({
        error: 'Failed to delete whitelisted address',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if an address is whitelisted
   * POST /api/user/whitelisted-addresses/check
   */
  static async checkAddress(req: Request, res: Response) {
    try {
      const { address } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      if (!address) {
        return res.status(400).json({ error: 'Address is required' });
      }

      // Validate address format
      const isValidAddress = await WhitelistedAddressModel.validateAddress(address);
      if (!isValidAddress) {
        return res.status(400).json({ 
          error: 'Invalid Solana address format' 
        });
      }

      // Check if address is whitelisted
      const isWhitelisted = await WhitelistedAddressModel.isAddressWhitelisted(userId, address);

      res.json({
        success: true,
        isWhitelisted,
        message: isWhitelisted ? 'Address is whitelisted' : 'Address is not whitelisted'
      });

    } catch (error) {
      console.error('[WhitelistedAddressController] Check address error:', error);
      res.status(500).json({
        error: 'Failed to check whitelisted address',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
