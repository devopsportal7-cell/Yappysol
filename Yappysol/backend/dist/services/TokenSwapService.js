"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenSwapService = exports.swapSessions = void 0;
const node_fetch_1 = __importDefault(require("node-fetch"));
const { TokenPriceService } = require('./TokenPriceService');
const WalletService_1 = require("./WalletService");
// In-memory session store (replace with Redis in production)
exports.swapSessions = {};
const SWAP_STEPS = ['fromToken', 'toToken', 'amount', 'confirmation'];
const SOL_MINT = 'So11111111111111111111111111111111111111112';
// Add popular tokens mapping
const POPULAR_TOKENS = [
    { symbol: 'SOL', name: 'Solana', mint: 'So11111111111111111111111111111111111111112' },
    { symbol: 'USDT', name: 'Tether', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB' },
    { symbol: 'USDC', name: 'USD Coin', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v' },
    { symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263' },
    // Add more as needed
];
function getNextStep(currentStep) {
    if (!currentStep)
        return SWAP_STEPS[0];
    const idx = SWAP_STEPS.indexOf(currentStep);
    return SWAP_STEPS[idx + 1] || null;
}
function getPreviousStep(currentStep) {
    if (!currentStep)
        return null;
    const idx = SWAP_STEPS.indexOf(currentStep);
    return idx > 0 ? SWAP_STEPS[idx - 1] : null;
}
function isValidSolanaAddress(address) {
    return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}
function validateSwapStepInput(step, input) {
    switch (step) {
        case 'fromToken':
        case 'toToken':
            if (!input || typeof input !== 'string' || input.length < 2)
                return 'Please provide a valid token contract address or ticker.';
            if (!isValidSolanaAddress(input) && !/^[A-Z0-9]{2,10}$/.test(input)) {
                return 'Invalid token contract address format or ticker. Please provide a valid contract address.';
            }
            return null;
        case 'amount':
            if (input === undefined || isNaN(Number(input)) || Number(input) <= 0)
                return 'Amount must be a positive number.';
            return null;
        default:
            return null;
    }
}
function resolveTokenMint(input) {
    const normalized = input.trim().toLowerCase();
    // Check by mint
    if (POPULAR_TOKENS.some(t => t.mint === input))
        return input;
    // Check by symbol
    const bySymbol = POPULAR_TOKENS.find(t => t.symbol.toLowerCase() === normalized);
    if (bySymbol)
        return bySymbol.mint;
    // Check by name
    const byName = POPULAR_TOKENS.find(t => t.name.toLowerCase() === normalized);
    if (byName)
        return byName.mint;
    return null;
}
class TokenSwapService {
    // Multi-step chat flow for token swap
    async handleSwapIntent(message, context) {
        const userId = context.userId || context.walletAddress || 'default';
        const userInput = message.trim();
        // Always handle cancel/abort first
        if (userInput.toLowerCase() === 'cancel' || userInput.toLowerCase() === 'abort') {
            delete exports.swapSessions[userId];
            return { prompt: 'Swap cancelled.', step: null };
        }
        // If the message is 'swap token', reset the session
        if (message.trim().toLowerCase() === 'swap token') {
            delete exports.swapSessions[userId];
        }
        let session = exports.swapSessions[userId] || { step: null };
        // Use currentStep from context if available, otherwise use session step
        let step = context.currentStep || session.step;
        // Update session with current step
        session.step = step;
        exports.swapSessions[userId] = session;
        // Interruption confirmation logic (moved up)
        if (session.awaitingInterruptConfirm) {
            if (userInput.trim().toLowerCase() === 'yes') {
                delete exports.swapSessions[userId];
                return { prompt: 'Swap flow interrupted. Please initiate the process again.', step: null };
            }
            else if (userInput.trim().toLowerCase() === 'no') {
                session.awaitingInterruptConfirm = false;
                exports.swapSessions[userId] = session;
                // Repeat the current step prompt
                let prompt = '';
                switch (session.step) {
                    case 'fromToken':
                        prompt = 'Which token do you want to swap from? (contract address or ticker)';
                        break;
                    case 'toToken':
                        prompt = 'Which token do you want to swap to? (contract address or ticker)';
                        break;
                    case 'amount':
                        prompt = 'How much do you want to swap?';
                        break;
                    case 'confirmation':
                        prompt = 'Type "proceed" to perform the swap or "cancel" to abort.';
                        break;
                    default:
                        prompt = 'Please continue the swap process.';
                        break;
                }
                return { prompt, step: session.step };
            }
            else {
                return { prompt: 'Reply "yes" to confirm interruption and reset, or "no" to continue the swap process.', step: session.step };
            }
        }
        // If no step, this is the first call after reset: prompt for fromToken and do NOT advance
        if (!step) {
            step = 'fromToken';
            session.step = step;
            exports.swapSessions[userId] = session;
            return { prompt: 'Which token do you want to swap from? (contract address or ticker)', step };
        }
        // Handle back
        if (userInput.toLowerCase() === 'back') {
            const prevStep = getPreviousStep(step);
            if (!prevStep)
                return { prompt: 'Already at the first step.', step };
            session.step = prevStep;
            exports.swapSessions[userId] = session;
            return { prompt: `Going back. Please provide ${prevStep}.`, step: prevStep };
        }
        // Save input for current step
        if (step) {
            if (step === 'amount') {
                session[step] = Number(userInput);
            }
            else if (step === 'fromToken' || step === 'toToken') {
                // Try to resolve symbol/name/mint
                const resolved = resolveTokenMint(userInput);
                session[step] = resolved || userInput;
            }
            else {
                session[step] = userInput;
            }
            // Validate input
            const validationError = validateSwapStepInput(step, session[step]);
            if (validationError) {
                session.validationErrorCount = (session.validationErrorCount || 0) + 1;
                exports.swapSessions[userId] = session;
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
        exports.swapSessions[userId] = session;
        // Only prompt for the next step, not the current one
        if (nextStep && nextStep !== 'confirmation') {
            let prompt = '';
            switch (nextStep) {
                case 'fromToken':
                    prompt = 'Which token do you want to swap from? (contract address or ticker)';
                    break;
                case 'toToken':
                    prompt = 'Which token do you want to swap to? (contract address or ticker)';
                    break;
                case 'amount':
                    prompt = 'How much do you want to swap?';
                    break;
                default:
                    prompt = 'Invalid step.';
                    break;
            }
            return { prompt, step: nextStep };
        }
        // If we've completed all steps, handle the confirmation
        if (nextStep === 'confirmation') {
            // Show summary and require 'proceed' to continue
            if (!session.awaitingConfirmation) {
                session.awaitingConfirmation = true;
                exports.swapSessions[userId] = session;
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
                            }
                            else {
                                toAmount = null;
                                toUsd = 0;
                            }
                        }
                    }
                }
                catch (e) { /* ignore price errors */ }
                const fromUsdDisplay = fromUsd !== null ? ` ($${fromUsd < 0.01 ? fromUsd.toFixed(8) : fromUsd.toFixed(4)} USD)` : '';
                const toUsdDisplay = toUsd !== null ? ` ($${toUsd < 0.01 ? toUsd.toFixed(8) : toUsd.toFixed(4)} USD)` : '';
                const toAmountDisplay = toAmount !== null ? `${toAmount < 0.01 ? toAmount.toFixed(8) : toAmount.toLocaleString(undefined, { maximumFractionDigits: 8 })}` : '-';
                // Get wallet and fee information
                let walletInfo = null;
                let fees = null;
                try {
                    walletInfo = await WalletService_1.WalletService.getUserDefaultWallet(userId);
                    if (walletInfo) {
                        fees = WalletService_1.WalletService.calculateTransactionFees('token-swap', session.amount);
                    }
                }
                catch (error) {
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
                }
                else if (session.toToken === SOL_MINT) {
                    action = 'sell';
                    mint = session.fromToken;
                    denominatedInSol = false;
                    amount = session.amount;
                }
                else {
                    delete exports.swapSessions[userId];
                    return { prompt: 'Only SOL <-> token swaps are supported at this time.', step: null };
                }
                // Get user's default wallet
                const walletInfo = await WalletService_1.WalletService.getUserDefaultWallet(userId);
                if (!walletInfo) {
                    delete exports.swapSessions[userId];
                    return { prompt: 'No wallet found. Please create or import a wallet first.', step: null };
                }
                // Validate wallet has sufficient balance
                const fees = WalletService_1.WalletService.calculateTransactionFees('token-swap', amount);
                const balanceCheck = await WalletService_1.WalletService.hasSufficientBalance(walletInfo.id, amount, fees);
                if (!balanceCheck.sufficient) {
                    delete exports.swapSessions[userId];
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
                const pumpRes = await (0, node_fetch_1.default)('https://pumpportal.fun/api/trade-local', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(swapRequest)
                });
                const contentType = pumpRes.headers.get('content-type');
                const buffer = await pumpRes.arrayBuffer();
                const text = Buffer.from(buffer).toString('utf-8');
                if (contentType && contentType.includes('application/json')) {
                    let pumpJson;
                    try {
                        pumpJson = JSON.parse(text);
                    }
                    catch (e) {
                        return { prompt: 'Swap failed', details: text, step: null };
                    }
                    if (pumpJson.error) {
                        return { prompt: 'Swap failed', details: pumpJson.error, step: null };
                    }
                    delete exports.swapSessions[userId];
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
                        }
                        else {
                            const fromPrice = await priceService.getTokenPrice(session.fromToken);
                            usdAmount = fromPrice.usdPrice * amount;
                        }
                    }
                    catch (e) {
                        usdAmount = null;
                    }
                    // Solscan link (use tx if available, else token)
                    let solscanLink = '';
                    if (pumpJson.txid) {
                        solscanLink = `https://solscan.io/tx/${pumpJson.txid}`;
                    }
                    else if (mint) {
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
                }
                else {
                    // Assume it's a transaction buffer
                    const transactionBase64 = Buffer.from(buffer).toString('base64');
                    delete exports.swapSessions[userId];
                    return {
                        prompt: 'Unsigned transaction generated. Please sign and submit with your wallet.',
                        unsignedTransaction: transactionBase64,
                        swapDetails: swapRequest,
                        requireSignature: true,
                        step: null
                    };
                }
            }
            catch (e) {
                delete exports.swapSessions[userId];
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
    async swapToken({ fromToken, toToken, amount, slippage = 0.5, priorityFee = 0, pool = 'auto', publicKey }) {
        let action, mint, denominatedInSol;
        if (fromToken === SOL_MINT) {
            action = 'buy';
            mint = toToken;
            denominatedInSol = true;
        }
        else if (toToken === SOL_MINT) {
            action = 'sell';
            mint = fromToken;
            denominatedInSol = false;
        }
        else {
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
        const pumpRes = await (0, node_fetch_1.default)('https://pumpportal.fun/api/trade-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(swapRequest)
        });
        const contentType = pumpRes.headers.get('content-type');
        const buffer = await pumpRes.arrayBuffer();
        const text = Buffer.from(buffer).toString('utf-8');
        if (contentType && contentType.includes('application/json')) {
            let pumpJson;
            try {
                pumpJson = JSON.parse(text);
            }
            catch (e) {
                throw new Error(text);
            }
            if (pumpJson.error) {
                throw new Error(pumpJson.error);
            }
            return {
                message: 'Swap transaction created. Please sign and submit.',
                unsignedTx: pumpJson.unsignedTx,
                swapDetails: swapRequest
            };
        }
        else {
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
exports.TokenSwapService = TokenSwapService;
