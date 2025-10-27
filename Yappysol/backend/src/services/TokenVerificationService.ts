/**
 * Token Verification Service
 * Checks if tokens are verified/legitimate and provides safety warnings
 */

import { logger } from '../utils/logger';
import axios from 'axios';

export interface TokenVerificationStatus {
  verified: boolean;
  warnings: string[];
  risk: 'low' | 'medium' | 'high';
  verifiedBy?: string[];
  supply?: string;
  holders?: number;
  age?: number; // days since creation
}

export class TokenVerificationService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = process.env.HELIUS_API_KEY || '';
    this.baseUrl = process.env.HELIUS_BASE_URL || 'https://api.helius.xyz';
  }

  /**
   * Check token verification status
   */
  async verifyToken(mint: string): Promise<TokenVerificationStatus> {
    try {
      logger.info('[TOKEN_VERIFY] Checking token:', { mint });

      // Check multiple sources
      const [tokenData, scanData] = await Promise.all([
        this.checkTokenMetadata(mint),
        this.checkSolscanData(mint)
      ]);

      const warnings: string[] = [];
      let risk: 'low' | 'medium' | 'high' = 'low';
      let verified = false;

      // Check verification status
      if (tokenData?.freezeAuthority === null && tokenData?.mintAuthority === null) {
        verified = true; // Token is burned (can't be manipulated)
      }

      // Check age
      if (scanData?.created) {
        const age = Math.floor((Date.now() - scanData.created) / (1000 * 60 * 60 * 24));
        if (age < 7) {
          warnings.push(`⚠️ Token created ${age} day(s) ago - very new`);
          risk = risk === 'low' ? 'medium' : risk;
        }
      }

      // Check holders
      if (scanData?.holders !== undefined) {
        if (scanData.holders < 10) {
          warnings.push(`⚠️ Low holder count: ${scanData.holders} holders`);
          risk = 'high';
        }
      }

      // Check supply
      if (tokenData?.supply) {
        const supply = parseFloat(tokenData.supply);
        if (supply > 1e12) {
          warnings.push(`⚠️ Very large supply: ${supply.toLocaleString()}`);
          risk = risk === 'low' ? 'medium' : risk;
        }
      }

      // Check for liquidity
      if (scanData?.liquidity === false) {
        warnings.push(`⚠️ No liquidity pool detected`);
        risk = 'high';
      }

      const verifiedBy: string[] = [];
      if (verified) {
        verifiedBy.push('Authority burned (immutable)');
      }
      if (scanData?.holderCount && scanData.holderCount > 100) {
        verifiedBy.push('High holder count');
      }

      return {
        verified,
        warnings,
        risk,
        verifiedBy,
        supply: tokenData?.supply,
        holders: scanData?.holders,
        age: scanData?.age
      };
    } catch (error) {
      logger.error('[TOKEN_VERIFY] Error verifying token:', { error, mint });
      return {
        verified: false,
        warnings: ['Unable to verify token details'],
        risk: 'medium'
      };
    }
  }

  /**
   * Check token metadata from Helius
   */
  private async checkTokenMetadata(mint: string): Promise<any> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/v0/token-metadata?api-key=${this.apiKey}`,
        {
          mintAccounts: [mint]
        }
      );

      if (response.data && response.data[0]) {
        return response.data[0];
      }
      return null;
    } catch (error) {
      logger.error('[TOKEN_VERIFY] Error fetching metadata:', { error, mint });
      return null;
    }
  }

  /**
   * Check Solscan data for additional verification
   */
  private async checkSolscanData(mint: string): Promise<any> {
    try {
      const response = await axios.get(
        `https://public-api.solscan.io/token/meta?tokenAddress=${mint}`
      );

      return response.data;
    } catch (error) {
      logger.error('[TOKEN_VERIFY] Error fetching Solscan data:', { error, mint });
      return null;
    }
  }

  /**
   * Generate safety warning message
   */
  generateWarning(
    status: TokenVerificationStatus,
    tokenSymbol: string,
    action: 'swap' | 'hold' | 'trade'
  ): string {
    if (status.risk === 'low' && status.warnings.length === 0) {
      return '';
    }

    let warning = `\n\n⚠️ **Safety Warning: ${tokenSymbol}**\n\n`;

    if (status.warnings.length > 0) {
      warning += status.warnings.join('\n') + '\n\n';
    }

    warning += `**Risk Level:** ${status.risk.toUpperCase()}\n`;
    warning += `**Verified:** ${status.verified ? 'Yes' : 'No'}\n`;

    if (status.holders !== undefined) {
      warning += `**Holders:** ${status.holders.toLocaleString()}\n`;
    }

    if (status.age !== undefined) {
      warning += `**Age:** ${status.age} days\n`;
    }

    warning += `\n**Recommendation:** `;

    switch (status.risk) {
      case 'high':
        warning += `⚠️ EXTREME CAUTION - This token shows high risk indicators. Consider avoiding this trade.`;
        break;
      case 'medium':
        warning += `⚠️ CAUTION - Review token details carefully before proceeding.`;
        break;
      case 'low':
        warning += `✅ Low risk indicators. Proceed with normal caution.`;
        break;
    }

    return warning;
  }
}

export const tokenVerificationService = new TokenVerificationService();

