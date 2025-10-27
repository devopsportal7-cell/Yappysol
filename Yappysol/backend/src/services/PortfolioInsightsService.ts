/**
 * Advanced Portfolio Insights Service
 * Provides sophisticated portfolio analysis and recommendations
 */

import { TokenBalance } from '../services/BalanceCacheService';

export interface PortfolioInsights {
  summary: PortfolioSummary;
  diversification: DiversificationAnalysis;
  risk: RiskAssessment;
  recommendations: PortfolioRecommendation[];
}

export interface PortfolioSummary {
  totalTokens: number;
  totalSolValue: number;
  totalUsdValue: number;
  largestHolding: TokenHolding;
  concentration: number; // percentage in largest holding
}

export interface TokenHolding {
  symbol: string;
  balance: number;
  usdValue: number;
  percentage: number;
}

export interface DiversificationAnalysis {
  score: number; // 0-100
  category: 'excellent' | 'good' | 'moderate' | 'low' | 'poor';
  analysis: string;
  suggestions: string[];
}

export interface RiskAssessment {
  overallRisk: 'low' | 'medium' | 'high';
  factors: RiskFactor[];
  score: number; // 0-100
  explanation: string;
}

export interface RiskFactor {
  type: 'concentration' | 'meme' | 'new' | 'liquid';
  severity: 'low' | 'medium' | 'high';
  description: string;
}

export interface PortfolioRecommendation {
  type: 'buy' | 'sell' | 'rebalance' | 'hold';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  action?: string;
}

export class PortfolioInsightsService {
  /**
   * Generate comprehensive portfolio insights
   */
  async generateInsights(tokens: TokenBalance[]): Promise<PortfolioInsights> {
    const summary = this.analyzePortfolioSummary(tokens);
    const diversification = this.analyzeDiversification(tokens);
    const risk = this.assessRisk(tokens, diversification);
    const recommendations = this.generateRecommendations(tokens, summary, diversification, risk);

    return {
      summary,
      diversification,
      risk,
      recommendations
    };
  }

  /**
   * Analyze portfolio summary
   */
  private analyzePortfolioSummary(tokens: TokenBalance[]): PortfolioSummary {
    if (tokens.length === 0) {
      return {
        totalTokens: 0,
        totalSolValue: 0,
        totalUsdValue: 0,
        largestHolding: { symbol: 'N/A', balance: 0, usdValue: 0, percentage: 0 },
        concentration: 0
      };
    }

    const totalUsd = tokens.reduce((sum, t) => sum + t.usdEquivalent, 0);
    const totalSol = tokens.reduce((sum, t) => sum + t.solEquivalent, 0);

    // Find largest holding
    const sortedByValue = [...tokens].sort((a, b) => b.usdEquivalent - a.usdEquivalent);
    const largest = sortedByValue[0];

    const concentration = (largest.usdEquivalent / totalUsd) * 100;

    return {
      totalTokens: tokens.length,
      totalSolValue: totalSol,
      totalUsdValue: totalUsd,
      largestHolding: {
        symbol: largest.symbol,
        balance: largest.uiAmount,
        usdValue: largest.usdEquivalent,
        percentage: concentration
      },
      concentration
    };
  }

  /**
   * Analyze diversification
   */
  private analyzeDiversification(tokens: TokenBalance[]): DiversificationAnalysis {
    if (tokens.length === 0) {
      return {
        score: 0,
        category: 'poor',
        analysis: 'No tokens in portfolio',
        suggestions: ['Add some tokens to start diversifying']
      };
    }

    if (tokens.length === 1) {
      return {
        score: 20,
        category: 'poor',
        analysis: 'Portfolio is 100% concentrated in one token',
        suggestions: [
          'Consider adding other tokens for diversification',
          'This creates significant concentration risk'
        ]
      };
    }

    if (tokens.length === 2) {
      return {
        score: 40,
        category: 'low',
        analysis: 'Portfolio has limited diversification with only 2 tokens',
        suggestions: [
          'Add 3-5 more different tokens',
          'Consider different categories (stablecoins, DeFi, meme coins)'
        ]
      };
    }

    // Check for diversification by category
    const hasStable = tokens.some(t => ['USDC', 'USDT'].includes(t.symbol));
    const hasNative = tokens.some(t => t.symbol === 'SOL');
    const hasMemes = tokens.some(t => ['BONK', 'WIF', 'BOME', 'POPCAT'].includes(t.symbol));
    const hasDefi = tokens.some(t => ['JUP', 'ORCA', 'RAY'].includes(t.symbol));

    let score = 50; // Base score for having multiple tokens
    let category: DiversificationAnalysis['category'] = 'moderate';
    let suggestions: string[] = [];

    if (hasNative && hasStable) score += 20;
    if (hasDefi) score += 10;
    if (!hasMemes || tokens.filter(t => ['BONK', 'WIF', 'BOME'].includes(t.symbol)).length < tokens.length * 0.5) {
      score += 10;
    }
    if (tokens.length >= 5) score += 10;

    if (score >= 80) category = 'excellent';
    else if (score >= 60) category = 'good';
    else if (score >= 40) category = 'moderate';
    else category = 'low';

    let analysis = '';
    if (score >= 80) {
      analysis = 'Excellent diversification across multiple token types';
    } else if (score >= 60) {
      analysis = 'Good diversification but could be improved';
    } else if (score >= 40) {
      analysis = 'Moderate diversification - consider adding more variety';
    } else {
      analysis = 'Low diversification - high concentration risk';
    }

    if (!hasStable) {
      suggestions.push('Consider adding stablecoins (USDC, USDT) for stability');
    }
    if (!hasNative) {
      suggestions.push('Consider holding some native SOL');
    }
    if (hasMemes && tokens.filter(t => ['BONK', 'WIF'].includes(t.symbol)).length > tokens.length * 0.7) {
      suggestions.push('High meme coin concentration - consider reducing exposure');
    }

    return {
      score,
      category,
      analysis,
      suggestions
    };
  }

  /**
   * Assess portfolio risk
   */
  private assessRisk(
    tokens: TokenBalance[],
    diversification: DiversificationAnalysis
  ): RiskAssessment {
    const factors: RiskFactor[] = [];
    let riskScore = 0;

    // Concentration risk
    const totalValue = tokens.reduce((sum, t) => sum + t.usdEquivalent, 0);
    const sortedByValue = [...tokens].sort((a, b) => b.usdEquivalent - a.usdEquivalent);
    const top3Value = sortedByValue.slice(0, 3).reduce((sum, t) => sum + t.usdEquivalent, 0);
    const top3Percentage = (top3Value / totalValue) * 100;

    if (top3Percentage > 90) {
      factors.push({
        type: 'concentration',
        severity: 'high',
        description: 'Top 3 holdings represent >90% of portfolio'
      });
      riskScore += 40;
    } else if (top3Percentage > 70) {
      factors.push({
        type: 'concentration',
        severity: 'medium',
        description: 'Top 3 holdings represent >70% of portfolio'
      });
      riskScore += 25;
    }

    // Meme coin risk
    const memeCoins = tokens.filter(t => ['BONK', 'WIF', 'BOME', 'POPCAT'].includes(t.symbol));
    const memePercentage = (memeCoins.reduce((sum, t) => sum + t.usdEquivalent, 0) / totalValue) * 100;

    if (memePercentage > 50) {
      factors.push({
        type: 'meme',
        severity: 'high',
        description: `${memePercentage.toFixed(0)}% in meme coins`
      });
      riskScore += 30;
    } else if (memePercentage > 20) {
      factors.push({
        type: 'meme',
        severity: 'medium',
        description: `${memePercentage.toFixed(0)}% in meme coins`
      });
      riskScore += 15;
    }

    // Diversification risk
    if (diversification.score < 40) {
      factors.push({
        type: 'concentration',
        severity: 'high',
        description: `Low diversification score: ${diversification.score}`
      });
      riskScore += 20;
    }

    let overallRisk: 'low' | 'medium' | 'high';
    let explanation: string;

    if (riskScore >= 70) {
      overallRisk = 'high';
      explanation = 'Multiple high-risk factors detected. Consider rebalancing portfolio.';
    } else if (riskScore >= 40) {
      overallRisk = 'medium';
      explanation = 'Some risk factors present. Monitor positions carefully.';
    } else {
      overallRisk = 'low';
      explanation = 'Low overall risk profile. Portfolio appears well-balanced.';
    }

    return {
      overallRisk,
      factors,
      score: riskScore,
      explanation
    };
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(
    tokens: TokenBalance[],
    summary: PortfolioSummary,
    diversification: DiversificationAnalysis,
    risk: RiskAssessment
  ): PortfolioRecommendation[] {
    const recommendations: PortfolioRecommendation[] = [];

    // Rebalancing recommendation
    if (summary.concentration > 50) {
      recommendations.push({
        type: 'rebalance',
        priority: 'high',
        title: 'Reduce Concentration Risk',
        description: `${summary.largestHolding.symbol} represents ${summary.concentration.toFixed(1)}% of portfolio. Consider reducing exposure.`,
        action: `Swap some ${summary.largestHolding.symbol} for other tokens`
      });
    }

    // Diversification recommendation
    if (diversification.score < 50) {
      recommendations.push({
        type: 'buy',
        priority: diversification.suggestions.length > 0 ? 'high' : 'medium',
        title: 'Improve Diversification',
        description: diversification.analysis,
        action: diversification.suggestions.join('; ')
      });
    }

    // Risk management recommendation
    if (risk.overallRisk === 'high') {
      recommendations.push({
        type: 'sell',
        priority: 'high',
        title: 'Reduce Risk Exposure',
        description: risk.explanation,
        action: 'Consider selling some high-risk positions'
      });
    }

    // Stablecoin recommendation
    const hasStable = tokens.some(t => ['USDC', 'USDT'].includes(t.symbol));
    if (!hasStable && risk.overallRisk !== 'low') {
      recommendations.push({
        type: 'buy',
        priority: 'medium',
        title: 'Add Stablecoins for Stability',
        description: 'Consider adding USDC or USDT to balance your portfolio.',
        action: 'Swap some holdings for stablecoins'
      });
    }

    return recommendations;
  }
}

export const portfolioInsightsService = new PortfolioInsightsService();

