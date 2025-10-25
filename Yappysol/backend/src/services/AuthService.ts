import jwt from 'jsonwebtoken';
import { UserModel, User, CreateUserData, LoginData, UserWithWallets } from '../models/UserSupabase';
import { WalletModel, CreateWalletData, ImportWalletData } from '../models/WalletSupabase';
import { ApiKeyModel, CreateApiKeyData } from '../models/ApiKeySupabase';
import { UserSessionModel } from '../models/UserSessionSupabase';
import { WalletService } from './WalletService';
import { PrivyAuthService } from './PrivyAuthService';

export interface AuthResult {
  success: boolean;
  user?: UserWithWallets;
  token?: string;
  error?: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  authType?: 'jwt' | 'privy';
  iat: number;
  exp: number;
}

export class AuthService {
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '7d';

  static async register(data: CreateUserData): Promise<AuthResult> {
    try {
      // Check if user already exists
      const existingUser = await UserModel.findByEmail(data.email);
      if (existingUser) {
        return {
          success: false,
          error: 'User with this email already exists'
        };
      }

      // Create user
      const user = await UserModel.createUser(data);
      
      // Create default wallet
      const wallet = await WalletModel.createWallet({
        userId: user.id,
        isImported: false
      });

      // Generate API key for Pump.fun (placeholder - you'll need to integrate with actual API)
      const pumpApiKey = await this.generatePumpApiKey();
      await ApiKeyModel.createApiKey({
        userId: user.id,
        service: 'pump',
        apiKey: pumpApiKey
      });

      // Generate JWT token
      const token = this.generateToken(user);

      // Create user session for tracking
      try {
        await UserSessionModel.createSession({
          userId: user.id,
          authType: 'jwt',
          internalToken: token,
          deviceInfo: 'web-browser', // Could be enhanced with actual device info
          ipAddress: 'unknown', // Could be enhanced with actual IP
          userAgent: 'unknown' // Could be enhanced with actual user agent
        });
      } catch (error) {
        console.error('Failed to create JWT session during registration:', error);
        // Don't fail authentication if session creation fails
      }

      return {
        success: true,
        user,
        token
      };
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: 'Registration failed. Please try again.'
      };
    }
  }

  static async login(data: LoginData): Promise<AuthResult> {
    try {
      const user = await UserModel.findByEmail(data.email);
      if (!user) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      const isValidPassword = await UserModel.validatePassword(user, data.password);
      if (!isValidPassword) {
        return {
          success: false,
          error: 'Invalid email or password'
        };
      }

      const token = this.generateToken(user);

      // Create user session for tracking
      try {
        await UserSessionModel.createSession({
          userId: user.id,
          authType: 'jwt',
          internalToken: token,
          deviceInfo: 'web-browser', // Could be enhanced with actual device info
          ipAddress: 'unknown', // Could be enhanced with actual IP
          userAgent: 'unknown' // Could be enhanced with actual user agent
        });
      } catch (error) {
        console.error('Failed to create JWT session:', error);
        // Don't fail authentication if session creation fails
      }

      // Get user wallets and portfolio data
      let wallets: any[] = [];
      let portfolio: any = null;
      
      try {
        // Get user wallets with balances
        wallets = await WalletService.getUserWallets(user.id);
        
        // Get portfolio data for the first wallet (if available)
        if (wallets.length > 0) {
          const { UserPortfolioService } = await import('./UserPortfolioService');
          const portfolioService = new UserPortfolioService();
          portfolio = await portfolioService.getUserPortfolioWithMetadata(wallets[0].publicKey);
        }
      } catch (error) {
        console.error('Error fetching wallet/portfolio data during login:', error);
        // Don't fail login if portfolio fetch fails
      }

      return {
        success: true,
        user: {
          ...user,
          wallets,
          portfolio
        },
        token
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        error: 'Login failed. Please try again.'
      };
    }
  }

  static async importWallet(userId: string, privateKey: string): Promise<{ success: boolean; wallet?: any; error?: string }> {
    try {
      const wallet = await WalletModel.importWallet({
        userId,
        privateKey
      });

      return {
        success: true,
        wallet
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to import wallet'
      };
    }
  }

  static async getUserWallets(userId: string): Promise<any[]> {
    return await WalletService.getUserWallets(userId);
  }

  static async getUserApiKeys(userId: string): Promise<any[]> {
    return await ApiKeyModel.findByUserId(userId);
  }

  static async authenticateWithPrivy(privyToken: string): Promise<AuthResult> {
    try {
      const result = await PrivyAuthService.verifyPrivyToken(privyToken);
      return result;
    } catch (error) {
      console.error('Privy authentication error:', error);
      return {
        success: false,
        error: 'Privy authentication failed'
      };
    }
  }

  static verifyToken(token: string): TokenPayload | null {
    try {
      return jwt.verify(token, this.JWT_SECRET) as TokenPayload;
    } catch (error) {
      return null;
    }
  }

  private static generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        authType: 'jwt'
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  private static async generatePumpApiKey(): Promise<string> {
    // This is a placeholder - you'll need to integrate with actual Pump.fun API
    // to generate real API keys
    return `pump_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }
}
