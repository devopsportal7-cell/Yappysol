import fetch from 'node-fetch';
const { TokenPriceService } = require('./TokenPriceService');
import { WalletService } from './WalletService';

// In-memory session store (replace with Redis in production)
export const swapSessions: Record<string, any> = {};

const SWAP_STEPS = ['fromToken', 'toToken', 'amount', 'confirmation'];
const SOL_MINT = 'So11111111111111111111111111111111111111112';

// Add popular tokens mapping
const POPULAR_TOKENS = [
  { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
  { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
  { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
  { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
  { symbol: 'RAY', name: 'Raydium', mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R' },
  { symbol: 'SRM', name: 'Serum', mint: 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt' },
  { symbol: 'ORCA', name: 'Orca', mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE' },
  { symbol: 'MNGO', name: 'Mango', mint: 'MangoCzJ36AjZyKwVj3VnYU4GTonjfVEnJmvvWaxLac' },
  { symbol: 'STEP', name: 'Step Finance', mint: 'StepAscQoEioFxxWGnh2sLBDFp9d8rvKz2Yp39iDpyT' },
  { symbol: 'COPE', name: 'Cope', mint: '8HGyAAB1yoM1ttS7pXjHMa3dukTFGQggnFFH3hJZgzQh' },
  { symbol: 'ROPE', name: 'Rope', mint: '8PMHT4swUMtBzgHnh5U564N5sjPSiUz2cjEQzFnnP1Fo' },
  { symbol: 'FIDA', name: 'Bonfida', mint: 'EchesyfXePKdLtoiZSL8pBe8Myagyy8ZRqsACNCFGnvp' },
  { symbol: 'KIN', name: 'Kin', mint: 'kinXdEcpDQeHPEuQnqmUgtYykqKGVFq6CeVX5iAHJq6' },
  { symbol: 'MAPS', name: 'Maps', mint: 'MAPS41MDahZ9QdKXhVa4dWB9RuyfV4XqhyAZ8XcYepb' },
  { symbol: 'OXY', name: 'Oxygen', mint: 'z3dn17FLaLK39vv1HT8vcnHErzTxkv7RDdTzd1G69a1' },
  { symbol: 'ATLAS', name: 'Star Atlas', mint: 'ATLASXmbPQxBUYbxPsV97usA3fPQYEqzQBUHgiFCUsXx' },
  { symbol: 'POLIS', name: 'Star Atlas DAO', mint: 'poLisWXnNRwC6oBu1vHiuKQzFjZ4XdLDZx5jHNjNNs6' },
  { symbol: 'SAMO', name: 'Samoyedcoin', mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU' },
  { symbol: 'SLIM', name: 'Solanium', mint: 'xxxxa1sKNGwFtw2kFn8XauW9xq8jBcZxXFycLPM7' },
  { symbol: 'LIKE', name: 'Only1', mint: '3bRTivrVsitbmCTGtqwp7hxXrsybztdB9Hd1J2LZefo' },
  { symbol: 'MEDIA', name: 'Media Network', mint: 'ETAtLmCmsoiEEKfNrHKJ2kYy3MoABhU6NQvpSfij5tDs' },
  { symbol: 'TULIP', name: 'Tulip Protocol', mint: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs' },
  { symbol: 'SLND', name: 'Solend', mint: 'SLNDpmoWTVADgEdndyvWzroNL7zSi1dF9PC3xHGtPwp' },
  { symbol: 'PORT', name: 'Port Finance', mint: 'PoRTjZMPXb9T7dyU7tpLEZRQj7e6ssfAE62j2oQuc6y' },
  { symbol: 'TULIP', name: 'Tulip Protocol', mint: 'TuLipcqtGVXP9XR62wM8WWCm6a9vhLs7T1uoWBk6FDs' },
  { symbol: 'mSOL', name: 'Marinade Staked SOL', mint: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So' },
  { symbol: 'stSOL', name: 'Lido Staked SOL', mint: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj' },
  { symbol: 'scnSOL', name: 'Socean Staked SOL', mint: '5oVNBeEEQvYi1cX3ir8Dx5n1P7pdxydbGF2X4TxVusJm' },
  { symbol: 'ETH', name: 'Ethereum (Wormhole)', mint: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs' },
  { symbol: 'BTC', name: 'Bitcoin (Wormhole)', mint: '9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E' },
  { symbol: 'USDCet', name: 'USD Coin (Wormhole)', mint: 'A9mUU4qviSctJVPJdBJWkb28deg915LYJKrzQ19ji3FM' },
  { symbol: 'USDTet', name: 'Tether USD (Wormhole)', mint: 'Dn4noZ5jgGfk4zcZ3eY3gB1oU2A8Vq7N6SE1aG2mCz6z' }
];

function getNextStep(currentStep: string | null) {
  if (!currentStep) return SWAP_STEPS[0];
  const idx = SWAP_STEPS.indexOf(currentStep);
  return SWAP_STEPS[idx + 1] || null;
}

function getPreviousStep(currentStep: string | null) {
  if (!currentStep) return null;
  const idx = SWAP_STEPS.indexOf(currentStep);
  return idx > 0 ? SWAP_STEPS[idx - 1] : null;
}

function isValidSolanaAddress(address: string) {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}

function validateSwapStepInput(step: string, input: any): string | null {
  switch (step) {
    case 'fromToken':
    case 'toToken':
      if (!input || typeof input !== 'string' || input.length < 2) return 'Please provide a valid token contract address or ticker.';
      
      // Check if it's a valid Solana address
      if (isValidSolanaAddress(input)) return null;
      
      // Check if it's a valid token symbol (more flexible regex)
      if (/^[A-Za-z0-9]{2,20}$/.test(input)) return null;
      
      // Check if it's a known token name (like "solana")
      const normalized = input.trim().toLowerCase();
      const knownTokens = ['solana', 'sol', 'usdc', 'usdt', 'bonk', 'ethereum', 'bitcoin', 'btc', 'eth'];
      if (knownTokens.includes(normalized)) return null;
      
      return 'Invalid token contract address format or ticker. Please provide a valid contract address or token symbol (e.g., SOL, USDC, solana).';
    case 'amount':
      if (input === undefined || isNaN(Number(input)) || Number(input) <= 0) return 'Amount must be a positive number.';
      return null;
    default:
      return null;
  }
}

function resolveTokenMint(input: string): string | null {
  const normalized = input.trim().toLowerCase();
  
  // Check by mint (exact match)
  if (POPULAR_TOKENS.some(t => t.mint === input)) return input;
  
  // Check by symbol (case insensitive)
  const bySymbol = POPULAR_TOKENS.find(t => t.symbol.toLowerCase() === normalized);
  if (bySymbol) return bySymbol.mint;
  
  // Check by name (case insensitive)
  const byName = POPULAR_TOKENS.find(t => t.name.toLowerCase() === normalized);
  if (byName) return byName.mint;
  
  // Handle common aliases
  const aliases: Record<string, string> = {
    'solana': 'So11111111111111111111111111111111111111112',
    'sol': 'So11111111111111111111111111111111111111112',
    'usdc': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'usdt': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'bonk': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'tether': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'usd coin': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'
  };
  
  if (aliases[normalized]) return aliases[normalized];
  
  return null;
}

export class TokenSwapService {
  /**
   * Determine the next missing step intelligently
   */
  private getNextMissingStep(session: any): string | null {
    // Check what's missing in order of priority
    if (!session.fromToken) {
      return 'fromToken';
    }
    if (!session.toToken) {
      return 'toToken';
    }
    if (!session.amount) {
      return 'amount';
    }
    // All required steps are complete
    return null;
  }

  /**
   * Get appropriate prompt for the current step
   */
  private getStepPrompt(step: string, session: any): string {
    switch (step) {
      case 'fromToken':
        return 'Which token do you want to swap from? (contract address or ticker)';
      case 'toToken':
        return `Which token do you want to swap to? (contract address or ticker)`;
      case 'amount':
        const fromSymbol = this.getTokenSymbol(session.fromToken);
        const toSymbol = this.getTokenSymbol(session.toToken);
        return `How much ${fromSymbol} do you want to swap for ${toSymbol}?`;
      default:
        return 'Please continue the swap process.';
    }
  }

  /**
   * Get token symbol from mint address
   */
  private getTokenSymbol(mint: string): string {
    const token = POPULAR_TOKENS.find(t => t.mint === mint);
    return token ? token.symbol : mint;
  }

  /**
   * Generate swap confirmation summary
   */
  private async generateSwapConfirmation(session: any, userId: string): Promise<any> {
    // --- USD Value Calculation ---
    const priceService = new TokenPriceService();
    let fromUsd = null, toUsd = null, fromSymbol = '', toSymbol = '', toAmount = null;
    const EXCHANGE_FEE_RATE = 0.0192; // 1.92%
    
    try {
      if (session.fromToken && session.amount) {
        const fromPrice = await priceService.getTokenPriceWithMetadata(session.fromToken);
        fromUsd = fromPrice.usdPrice * session.amount;
        fromSymbol = fromPrice.symbol || session.fromToken;
        // Calculate fee
        const feeUsd = fromUsd * EXCHANGE_FEE_RATE;
        const fromUsdAfterFee = fromUsd - feeUsd;
        if (session.toToken) {
          const toPrice = await priceService.getTokenPriceWithMetadata(session.toToken);
          toSymbol = toPrice.symbol || session.toToken;
          // Calculate how much toToken the user will get for the USD value of fromToken after fee
          if (toPrice.usdPrice > 0) {
            toAmount = fromUsdAfterFee / toPrice.usdPrice;
            toUsd = toAmount * toPrice.usdPrice; // Should be ≈ fromUsdAfterFee
          } else {
            toAmount = null;
            toUsd = 0;
          }
        }
      }
    } catch (e) { /* ignore price errors */ }
    
    const fromUsdDisplay = fromUsd !== null ? ` ($${fromUsd < 0.01 ? fromUsd.toFixed(8) : fromUsd.toFixed(4)} USD)` : '';
    const toUsdDisplay = toUsd !== null ? ` ($${toUsd < 0.01 ? toUsd.toFixed(8) : toUsd.toFixed(4)} USD)` : '';
    const toAmountDisplay = toAmount !== null ? `${toAmount < 0.01 ? toAmount.toFixed(8) : toAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : '-';
    
    // Get wallet and fee information
    let walletInfo = null;
    let fees = null;
    try {
      walletInfo = await WalletService.getUserDefaultWallet(userId);
      if (walletInfo) {
        fees = WalletService.calculateTransactionFees('token-swap', session.amount);
      }
    } catch (error) {
      console.error('Error getting wallet info for swap confirmation:', error);
    }

    let summary = `🔄 **Swap Summary**\n` +
      `-----------------------------\n` +
      `**From:** ${session.amount || '-'} ${fromSymbol}${fromUsdDisplay}\n` +
      `**To:** ${toAmountDisplay} ${toSymbol}${toUsdDisplay}\n` +
      `-----------------------------\n`;

    // Add wallet and fee information if available
    if (walletInfo && fees) {
      summary += `\n💰 **Transaction Details:**\n` +
        `Wallet: ${walletInfo.publicKey.slice(0, 8)}...${walletInfo.publicKey.slice(-8)}\n` +
        `Balance: ${walletInfo.balance.toFixed(6)} SOL\n` +
        `Network Fee: ${fees.networkFee.toFixed(6)} SOL\n` +
        `Priority Fee: ${fees.priorityFee.toFixed(6)} SOL\n` +
        `Total Cost: ${fees.estimatedCost.toFixed(6)} SOL\n`;
    }

    summary += `\nType 'proceed' to perform the swap or 'cancel' to abort.`;
    
    return {
      prompt: summary,
      step: 'confirmation',
      requireSignature: false,
      swapDetails: {
        fromToken: session.fromToken,
        toToken: session.toToken,
        amount: session.amount
      }
    };
  }
  // Multi-step chat flow for token swap
  async handleSwapIntent(message: string, context: any) {
    const userId = context.userId || context.walletAddress || 'default';
    const userInput = message.trim();
    
    // Always handle cancel/abort first
    if (userInput.toLowerCase() === 'cancel' || userInput.toLowerCase() === 'abort') {
      delete swapSessions[userId];
      return { prompt: 'Swap cancelled.', step: null };
    }
    
    // If the message is 'swap token', reset the session
    if (message.trim().toLowerCase() === 'swap token') {
      delete swapSessions[userId];
    }
    
    let session = swapSessions[userId] || { step: null };
    
    // SMART ENTITY HANDLING: Check if entities are provided in context
    const hasPreExtractedEntities = context.fromToken || context.toToken || context.amount;
    
    if (hasPreExtractedEntities) {
      console.log('[TokenSwapService] Pre-extracted entities found:', {
        fromToken: context.fromToken,
        toToken: context.toToken,
        amount: context.amount
      });
      
      // Populate session with pre-extracted entities
      if (context.fromToken) {
        const resolvedFromToken = resolveTokenMint(context.fromToken);
        session.fromToken = resolvedFromToken || context.fromToken;
        console.log('[TokenSwapService] Set fromToken:', session.fromToken);
      }
      
      if (context.toToken) {
        const resolvedToToken = resolveTokenMint(context.toToken);
        session.toToken = resolvedToToken || context.toToken;
        console.log('[TokenSwapService] Set toToken:', session.toToken);
      }
      
      if (context.amount) {
        session.amount = Number(context.amount);
        console.log('[TokenSwapService] Set amount:', session.amount);
      }
      
      // Determine the next missing step intelligently
      const nextMissingStep = this.getNextMissingStep(session);
      console.log('[TokenSwapService] Next missing step:', nextMissingStep);
      
      if (nextMissingStep) {
        session.step = nextMissingStep;
        swapSessions[userId] = session;
        
        // Return prompt for the missing step
        const prompt = this.getStepPrompt(nextMissingStep, session);
        return { prompt, step: nextMissingStep };
      } else {
        // All required information is available, go to confirmation
        session.step = 'confirmation';
        session.awaitingConfirmation = true;
        swapSessions[userId] = session;
        
        // Generate confirmation summary
        return this.generateSwapConfirmation(session, userId);
      }
    }
    
    // Use currentStep from context if available, otherwise use session step
    let step = context.currentStep || session.step;
    
    // Update session with current step
    session.step = step;
    swapSessions[userId] = session;

    // Interruption confirmation logic (moved up)
    if (session.awaitingInterruptConfirm) {
      if (userInput.trim().toLowerCase() === 'yes') {
        delete swapSessions[userId];
        return { prompt: 'Swap flow interrupted. Please initiate the process again.', step: null };
      } else if (userInput.trim().toLowerCase() === 'no') {
        session.awaitingInterruptConfirm = false;
        swapSessions[userId] = session;
        // Repeat the current step prompt
        let prompt = '';
        switch (session.step) {
          case 'fromToken': prompt = 'Which token do you want to swap from? (contract address or ticker)'; break;
          case 'toToken': prompt = 'Which token do you want to swap to? (contract address or ticker)'; break;
          case 'amount': prompt = 'How much do you want to swap?'; break;
          case 'confirmation': prompt = 'Type "proceed" to perform the swap or "cancel" to abort.'; break;
          default: prompt = 'Please continue the swap process.'; break;
        }
        return { prompt, step: session.step };
      } else {
        return { prompt: 'Reply "yes" to confirm interruption and reset, or "no" to continue the swap process.', step: session.step };
      }
    }

    // If no step, this is the first call after reset: prompt for fromToken and do NOT advance
    if (!step) {
      step = 'fromToken';
      session.step = step;
      swapSessions[userId] = session;
      return { prompt: 'Which token do you want to swap from? (contract address or ticker)', step };
    }

    // Handle back
    if (userInput.toLowerCase() === 'back') {
      const prevStep = getPreviousStep(step);
      if (!prevStep) return { prompt: 'Already at the first step.', step };
      session.step = prevStep;
      swapSessions[userId] = session;
      return { prompt: `Going back. Please provide ${prevStep}.`, step: prevStep };
    }

    // Save input for current step
    if (step) {
      if (step === 'amount') {
        session[step] = Number(userInput);
      } else if (step === 'fromToken' || step === 'toToken') {
        // Try to resolve symbol/name/mint
        const resolved = resolveTokenMint(userInput);
        session[step] = resolved || userInput;
      } else {
        session[step] = userInput;
      }
      // Validate input
      const validationError = validateSwapStepInput(step, session[step]);
      if (validationError) {
        session.validationErrorCount = (session.validationErrorCount || 0) + 1;
        swapSessions[userId] = session;
        if (session.validationErrorCount >= 3) {
          session.awaitingInterruptConfirm = true;
          session.validationErrorCount = 0;
          return { prompt: 'It looks like you may want to interrupt the swap flow. Reply "yes" to confirm interruption and reset, or "no" to continue.', step: session.step };
        }
        return { prompt: validationError, step };
      }
      session.validationErrorCount = 0;
    }

    // Advance to next step
    const nextStep = getNextStep(step);
    session.step = nextStep;
    swapSessions[userId] = session;

    // Only prompt for the next step, not the current one
    if (nextStep && nextStep !== 'confirmation') {
      let prompt = '';
      switch (nextStep) {
        case 'fromToken': prompt = 'Which token do you want to swap from? (contract address or ticker)'; break;
        case 'toToken': prompt = 'Which token do you want to swap to? (contract address or ticker)'; break;
        case 'amount': prompt = 'How much do you want to swap?'; break;
        default: prompt = 'Invalid step.'; break;
      }
      return { prompt, step: nextStep };
    }

    // If we've completed all steps, handle the confirmation
    if (nextStep === 'confirmation') {
      // Show summary and require 'proceed' to continue
      if (!session.awaitingConfirmation) {
        session.awaitingConfirmation = true;
        swapSessions[userId] = session;
        // --- USD Value Calculation ---
        const priceService = new TokenPriceService();
        let fromUsd = null, toUsd = null, fromSymbol = '', toSymbol = '', toAmount = null;
        const EXCHANGE_FEE_RATE = 0.0192; // 1.92%
        try {
          if (session.fromToken && session.amount) {
            const fromPrice = await priceService.getTokenPriceWithMetadata(session.fromToken);
            fromUsd = fromPrice.usdPrice * session.amount;
            fromSymbol = fromPrice.symbol || session.fromToken;
            // Calculate fee
            const feeUsd = fromUsd * EXCHANGE_FEE_RATE;
            const fromUsdAfterFee = fromUsd - feeUsd;
            if (session.toToken) {
              const toPrice = await priceService.getTokenPriceWithMetadata(session.toToken);
              toSymbol = toPrice.symbol || session.toToken;
              // Calculate how much toToken the user will get for the USD value of fromToken after fee
              if (toPrice.usdPrice > 0) {
                toAmount = fromUsdAfterFee / toPrice.usdPrice;
                toUsd = toAmount * toPrice.usdPrice; // Should be ≈ fromUsdAfterFee
              } else {
                toAmount = null;
                toUsd = 0;
              }
            }
          }
        } catch (e) { /* ignore price errors */ }
        const fromUsdDisplay = fromUsd !== null ? ` ($${fromUsd < 0.01 ? fromUsd.toFixed(8) : fromUsd.toFixed(4)} USD)` : '';
        const toUsdDisplay = toUsd !== null ? ` ($${toUsd < 0.01 ? toUsd.toFixed(8) : toUsd.toFixed(4)} USD)` : '';
        const toAmountDisplay = toAmount !== null ? `${toAmount < 0.01 ? toAmount.toFixed(8) : toAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : '-';
        
        // Get wallet and fee information
        let walletInfo = null;
        let fees = null;
        try {
          walletInfo = await WalletService.getUserDefaultWallet(userId);
          if (walletInfo) {
            fees = WalletService.calculateTransactionFees('token-swap', session.amount);
          }
        } catch (error) {
          console.error('Error getting wallet info for swap confirmation:', error);
        }

        let summary = `🔄 **Swap Summary**\n` +
          `-----------------------------\n` +
          `**From:** ${session.amount || '-'} ${fromSymbol}${fromUsdDisplay}\n` +
          `**To:** ${toAmountDisplay} ${toSymbol}${toUsdDisplay}\n` +
          `-----------------------------\n`;

        // Add wallet and fee information if available
        if (walletInfo && fees) {
          summary += `\n💰 **Transaction Details:**\n` +
            `Wallet: ${walletInfo.publicKey.slice(0, 8)}...${walletInfo.publicKey.slice(-8)}\n` +
            `Balance: ${walletInfo.balance.toFixed(6)} SOL\n` +
            `Network Fee: ${fees.networkFee.toFixed(6)} SOL\n` +
            `Priority Fee: ${fees.priorityFee.toFixed(6)} SOL\n` +
            `Total Cost: ${fees.estimatedCost.toFixed(6)} SOL\n`;
        }

        summary += `\nType 'proceed' to perform the swap or 'cancel' to abort.`;
        return {
          prompt: summary,
          step: 'confirmation',
          requireSignature: false,
          swapDetails: {
            fromToken: session.fromToken,
            toToken: session.toToken,
            amount: session.amount
          }
        };
      }
    }

    // Handle confirmation if awaitingConfirmation is true and userInput is 'proceed'
    if (session.awaitingConfirmation && userInput.toLowerCase() === 'proceed') {
      try {
        session.awaitingConfirmation = false;
        // Determine action and params
        let action, mint, denominatedInSol, amount;
        if (session.fromToken === SOL_MINT) {
          action = 'buy';
          mint = session.toToken;
          denominatedInSol = true;
          amount = session.amount;
        } else if (session.toToken === SOL_MINT) {
          action = 'sell';
          mint = session.fromToken;
          denominatedInSol = false;
          amount = session.amount;
        } else {
          delete swapSessions[userId];
          return { prompt: 'Only SOL <-> token swaps are supported at this time.', step: null };
        }
        // Get user's default wallet
        const walletInfo = await WalletService.getUserDefaultWallet(userId);
        if (!walletInfo) {
          delete swapSessions[userId];
          return { prompt: 'No wallet found. Please create or import a wallet first.', step: null };
        }

        // Validate wallet has sufficient balance
        const fees = WalletService.calculateTransactionFees('token-swap', amount);
        const balanceCheck = await WalletService.hasSufficientBalance(
          walletInfo.id, 
          amount, 
          fees
        );

        if (!balanceCheck.sufficient) {
          delete swapSessions[userId];
          return { 
            prompt: `Insufficient balance. Need ${balanceCheck.required?.toFixed(6)} SOL, have ${balanceCheck.currentBalance.toFixed(6)} SOL. Please add ${balanceCheck.shortfall?.toFixed(6)} SOL to your wallet.`, 
            step: null 
          };
        }

        const swapRequest = {
          publicKey: walletInfo.publicKey,
          action,
          mint,
          denominatedInSol: denominatedInSol.toString(),
          amount,
          slippage: 0.5,
          priorityFee: fees.priorityFee,
          pool: 'auto',
        };
        // Log the swap request payload for debugging
        console.log('[DEBUG] Swap request payload:', swapRequest);
        // Call PumpPortal
        const pumpRes = await fetch('https://pumpportal.fun/api/trade-local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(swapRequest)
        });
        const contentType = pumpRes.headers.get('content-type');
        const buffer = await pumpRes.arrayBuffer();
        const text = Buffer.from(buffer).toString('utf-8');
        if (contentType && contentType.includes('application/json')) {
          let pumpJson;
          try { pumpJson = JSON.parse(text); } catch (e) { return { prompt: 'Swap failed', details: text, step: null }; }
          if (pumpJson.error) {
            return { prompt: 'Swap failed', details: pumpJson.error, step: null };
          }
          delete swapSessions[userId];

          // --- Swap Success Message Construction ---
          // Resolve symbols
          const fromTokenObj = POPULAR_TOKENS.find(t => t.mint === session.fromToken) || { symbol: session.fromToken };
          const toTokenObj = POPULAR_TOKENS.find(t => t.mint === session.toToken) || { symbol: session.toToken };
          const fromSymbol = fromTokenObj.symbol || session.fromToken;
          const toSymbol = toTokenObj.symbol || session.toToken;
          // Amount in SOL (if denominatedInSol)
          const amountSol = denominatedInSol ? amount : undefined;
          // Try to get USD equivalent (if possible)
          let usdAmount = null;
          try {
            const priceService = new TokenPriceService();
            if (denominatedInSol) {
              const solPrice = await priceService.getTokenPrice(SOL_MINT);
              usdAmount = solPrice.usdPrice * amount;
            } else {
              const fromPrice = await priceService.getTokenPrice(session.fromToken);
              usdAmount = fromPrice.usdPrice * amount;
            }
          } catch (e) { usdAmount = null; }
          // Solscan link (use tx if available, else token)
          let solscanLink = '';
          if (pumpJson.txid) {
            solscanLink = `https://solscan.io/tx/${pumpJson.txid}`;
          } else if (mint) {
            solscanLink = `https://solscan.io/token/${mint}`;
          }
          const usdDisplay = usdAmount !== null ? ` (~$${usdAmount.toFixed(2)} USD)` : '';
          const solDisplay = amountSol !== undefined ? `${amountSol} SOL` : `${amount} ${fromSymbol}`;
          return {
            prompt: 'Unsigned transaction generated. Please sign and submit with your wallet.',
            unsignedTransaction: pumpJson.unsignedTx,
            swapDetails: swapRequest,
            requireSignature: true,
            step: null
          };
        } else {
          // Assume it's a transaction buffer
          const transactionBase64 = Buffer.from(buffer).toString('base64');
          delete swapSessions[userId];
          return {
            prompt: 'Unsigned transaction generated. Please sign and submit with your wallet.',
            unsignedTransaction: transactionBase64,
            swapDetails: swapRequest,
            requireSignature: true,
            step: null
          };
        }
      } catch (e: any) {
        delete swapSessions[userId];
        return { prompt: 'Swap failed', details: e.message, step: null };
      }
    }

    // If we're still awaiting confirmation but user didn't type 'proceed', show the summary again
    if (session.awaitingConfirmation) {
      const summary = `🔄 **Swap Summary**\n` +
        `-----------------------------\n` +
        `**From:** ${session.fromToken || '-'}\n` +
        `**To:** ${session.toToken || '-'}\n` +
        `**Amount:** ${session.amount || '-'}\n` +
        `-----------------------------\n` +
        `\nType 'proceed' to perform the swap or 'cancel' to abort.`;
      return {
        prompt: summary,
        step: 'confirmation',
        requireSignature: false,
        swapDetails: {
          fromToken: session.fromToken,
          toToken: session.toToken,
          amount: session.amount
        }
      };
    }

    // If for some reason no code path above returns, log and return a fallback
    console.error('[TokenSwapService] handleSwapIntent reached unexpected end', { userId, step, session, userInput });
    return { prompt: 'Unexpected error in swap flow. Please try again.', step: null };
  }

  async swapToken({ fromToken, toToken, amount, slippage = 0.5, priorityFee = 0, pool = 'auto', publicKey }: any) {
    let action, mint, denominatedInSol;
    if (fromToken === SOL_MINT) {
      action = 'buy';
      mint = toToken;
      denominatedInSol = true;
    } else if (toToken === SOL_MINT) {
      action = 'sell';
      mint = fromToken;
      denominatedInSol = false;
    } else {
      throw new Error('Only SOL <-> token swaps are supported at this time.');
    }
    const swapRequest = {
      publicKey,
      action,
      mint,
      denominatedInSol: denominatedInSol.toString(),
      amount,
      slippage,
      priorityFee,
      pool,
    };
    const pumpRes = await fetch('https://pumpportal.fun/api/trade-local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(swapRequest)
    });
    const contentType = pumpRes.headers.get('content-type');
    const buffer = await pumpRes.arrayBuffer();
    const text = Buffer.from(buffer).toString('utf-8');
    if (contentType && contentType.includes('application/json')) {
      let pumpJson;
      try { pumpJson = JSON.parse(text); } catch (e) { throw new Error(text); }
      if (pumpJson.error) {
        throw new Error(pumpJson.error);
      }
      return {
        message: 'Swap transaction created. Please sign and submit.',
        unsignedTx: pumpJson.unsignedTx,
        swapDetails: swapRequest
      };
    } else {
      // Assume it's a transaction buffer
      const transactionBase64 = Buffer.from(buffer).toString('base64');
      return {
        message: 'Unsigned transaction generated. Please sign and submit with your wallet.',
        unsignedTransaction: transactionBase64,
        swapDetails: swapRequest
      };
    }
  }
} 