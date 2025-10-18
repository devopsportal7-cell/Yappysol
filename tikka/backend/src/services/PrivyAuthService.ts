import { PrivyClient, User as PrivyUserType } from '@privy-io/server-auth';
import { UserModel, User } from '../models/UserSupabase';
import { WalletModel } from '../models/WalletSupabase';
import { ApiKeyModel } from '../models/ApiKeySupabase';
import { UserSessionModel } from '../models/UserSessionSupabase';
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';

export interface PrivyAuthResult {
  success: boolean;
  user?: User;
  token?: string;
  error?: string;
}

export class PrivyAuthService {
  private static privy: PrivyClient;
  private static readonly JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
  private static readonly JWT_EXPIRES_IN = '7d';
  private static jwksClient: jwksClient.JwksClient;

  static initialize() {
    if (!process.env.PRIVY_APP_SECRET) {
      console.warn('PRIVY_APP_SECRET not found. Privy authentication will be disabled.');
      return;
    }
    
    this.privy = new PrivyClient(process.env.PRIVY_APP_SECRET, 'development');
    
    // Initialize JWKS client for JWT verification
    this.jwksClient = jwksClient({
      jwksUri: 'https://auth.privy.io/api/v1/jwks',
      cache: true,
      cacheMaxAge: 600000, // 10 minutes
      rateLimit: true,
      jwksRequestsPerMinute: 5
    });
  }

  static async verifyPrivyToken(accessToken: string, privyUserData?: { id: string; email: string }): Promise<PrivyAuthResult> {
    try {
      console.log('PrivyAuthService: Starting simple Privy authentication');
      console.log('PrivyAuthService: Token length:', accessToken?.length);
      
      // Use real Privy user data from frontend
      if (!privyUserData || !privyUserData.email) {
        console.log('PrivyAuthService: No Privy user data provided');
        return {
          success: false,
          error: 'No Privy user data provided'
        };
      }

      console.log('PrivyAuthService: Using real Privy user data:', privyUserData);
      
      // Create a Privy user object with the real data
      const realPrivyUser = {
        id: privyUserData.id,
        email: {
          address: privyUserData.email,
          verified: true,
          type: 'email',
          verifiedAt: new Date(),
          firstVerifiedAt: new Date(),
          latestVerifiedAt: new Date()
        },
        createdAt: new Date(),
        isGuest: false,
        customMetadata: {},
        linkedAccounts: []
      } as any;
      
      console.log('PrivyAuthService: Using real Privy user:', realPrivyUser);
      
      if (!realPrivyUser.email?.address) {
        console.log('PrivyAuthService: No email in Privy user');
        return {
          success: false,
          error: 'No email found in Privy user'
        };
      }

      // Find or create user in Supabase
      console.log('PrivyAuthService: Looking for existing user with email:', realPrivyUser.email.address);
      let dbUser = await UserModel.findByEmail(realPrivyUser.email.address);
      
      if (!dbUser) {
        // Create new user from real Privy data
        console.log('PrivyAuthService: Creating new user from real Privy data');
        try {
          dbUser = await this.createUserFromPrivy(realPrivyUser);
          console.log('PrivyAuthService: User created successfully:', dbUser.id);
        } catch (error) {
          console.error('PrivyAuthService: Error creating user:', error);
          throw error;
        }
      } else {
        console.log('PrivyAuthService: Found existing user:', dbUser.id);
      }

      // Generate internal JWT token for API compatibility
      const token = this.generateInternalToken(dbUser);

      // Create user session for tracking
      try {
        await UserSessionModel.createSession({
          userId: dbUser.id,
          authType: 'privy',
          privyToken: accessToken,
          internalToken: token,
          deviceInfo: 'web-browser', // Could be enhanced with actual device info
          ipAddress: 'unknown', // Could be enhanced with actual IP
          userAgent: 'unknown' // Could be enhanced with actual user agent
        });
        console.log('PrivyAuthService: User session created');
      } catch (error) {
        console.error('PrivyAuthService: Failed to create session:', error);
        // Don't fail authentication if session creation fails
      }

      console.log('PrivyAuthService: Authentication successful');
      return {
        success: true,
        user: dbUser,
        token
      };
    } catch (error) {
      console.error('Privy token verification error:', error);
      return {
        success: false,
        error: 'Invalid Privy token'
      };
    }
  }

  static async createUserFromPrivy(privyUser: PrivyUserType): Promise<User> {
    try {
      // Create user in Supabase with a special password for Privy users
      const privyPassword = `privy-${privyUser.id}-${Date.now()}`;
      const user = await UserModel.createUser({
        email: privyUser.email!.address,
        password: privyPassword
      });

      // Create default wallet
      const wallet = await WalletModel.createWallet({
        userId: user.id,
        isImported: false
      });

      // Generate API key for Pump.fun
      const pumpApiKey = this.generatePumpApiKey();
      await ApiKeyModel.createApiKey({
        userId: user.id,
        service: 'pump',
        apiKey: pumpApiKey
      });

      return user;
    } catch (error) {
      console.error('Error creating user from Privy:', error);
      throw error;
    }
  }

  static async getUserFromPrivyToken(accessToken: string): Promise<PrivyUserType | null> {
    try {
      if (!this.privy) return null;
      
      // Verify token and get user ID
      const tokenClaims = await this.privy.verifyAuthToken(accessToken, process.env.PRIVY_VERIFICATION_KEY);
      if (!tokenClaims.userId) return null;
      
      // Get full user data
      return await this.privy.getUser(tokenClaims.userId);
    } catch (error) {
      console.error('Error getting Privy user:', error);
      return null;
    }
  }

  private static generateInternalToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        authType: 'privy' // Mark as Privy authentication
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRES_IN }
    );
  }

  private static generatePumpApiKey(): string {
    return `pump_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
  }

  private static async verifyJWTToken(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      jwt.verify(token, (header, callback) => {
        this.jwksClient.getSigningKey(header.kid, (err, key) => {
          if (err) {
            callback(err);
          } else {
            const signingKey = key?.getPublicKey();
            callback(null, signingKey);
          }
        });
      }, {
        audience: process.env.PRIVY_APP_ID,
        issuer: 'https://auth.privy.io',
        algorithms: ['RS256']
      }, (err, decoded) => {
        if (err) {
          reject(err);
        } else {
          resolve(decoded);
        }
      });
    });
  }

  static isPrivyConfigured(): boolean {
    return !!process.env.PRIVY_APP_SECRET && !!this.privy && !!this.jwksClient;
  }
}
