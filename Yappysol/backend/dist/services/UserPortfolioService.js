"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserPortfolioService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const moralis_1 = require("../lib/moralis");
const HELIUS_API_KEY = process.env.HELIUS_API_KEY;
const HELIUS_BASE_URL = 'https://api.helius.xyz/v0';
const SOL_MINT = 'So11111111111111111111111111111111111111112';
const SOL_IMAGE = 'https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/solana/info/logo.png';
async function getHeliusMetadataBatch(mints, retries = 3) {
    console.log('[HELIUS] Requesting metadata for mints:', mints);
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios_1.default.post(`https://api.helius.xyz/v0/token-metadata?api-key=${config_1.default.HELIUS_API_KEY}`, {
                mintAccounts: mints,
                includeOffChain: true,
                disableCache: false
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (Array.isArray(response.data)) {
                console.log('[HELIUS] Response data:', JSON.stringify(response.data, null, 2));
                return response.data;
            }
        }
        catch (e) {
            if (i === retries - 1)
                throw e;
            await new Promise(res => setTimeout(res, 1000 * (i + 1)));
        }
    }
    return [];
}
function rewriteIpfsUri(uri) {
    if (uri.startsWith('ipfs://')) {
        return uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (uri.startsWith('https://ipfs.io/ipfs/')) {
        return uri.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
    }
    return uri;
}
// Helper to resolve the real image URL from a metadata URI or direct image
async function resolveImageUrl(imageOrUri) {
    if (!imageOrUri)
        return '';
    // If it's a JSON metadata file (ends with .json or doesn't look like an image)
    if (imageOrUri.endsWith('.json') ||
        (!imageOrUri.match(/\.(png|jpg|jpeg|gif|webp|svg)$/i) && imageOrUri.startsWith('http'))) {
        try {
            const resp = await axios_1.default.get(imageOrUri, { timeout: 10000 });
            if (resp.data && resp.data.image) {
                return resp.data.image;
            }
        }
        catch (e) {
            // fallback to original
        }
    }
    return imageOrUri;
}
class UserPortfolioService {
    async getUserPortfolio(walletAddress) {
        if (!HELIUS_API_KEY) {
            throw new Error('HELIUS_API_KEY is not set in environment variables');
        }
        if (!walletAddress) {
            throw new Error('Wallet address is required');
        }
        // Fetch all tokens owned by the user
        const url = `${HELIUS_BASE_URL}/addresses/${walletAddress}/balances?api-key=${HELIUS_API_KEY}`;
        const { data } = await axios_1.default.get(url);
        if (!data.tokens)
            return [];
        // Map and format tokens
        const tokens = await Promise.all(data.tokens.map(async (token) => {
            // Optionally fetch metadata (image, symbol, name, etc.)
            let meta = token;
            if (!token.logoURI || !token.symbol) {
                try {
                    const metaRes = await axios_1.default.get(`https://public-api.solscan.io/token/meta?tokenAddress=${token.mint}`);
                    meta = { ...token, ...metaRes.data };
                }
                catch (e) {
                    // Ignore metadata errors
                }
            }
            return {
                mint: token.mint,
                symbol: meta.symbol || token.mint.slice(0, 4),
                name: meta.name || '',
                amount: token.amount,
                decimals: token.decimals,
                uiAmount: token.uiAmount,
                usdValue: token.price ? (token.uiAmount * token.price).toFixed(2) : null,
                price: token.price || null,
                image: meta.logoURI || null,
                solscan: `https://solscan.io/token/${token.mint}`,
            };
        }));
        return tokens.filter(t => t.uiAmount > 0);
    }
    async formatPortfolioForChat(walletAddress) {
        try {
            // Get portfolio with metadata (includes SOL + SPL tokens)
            const tokens = await this.getUserPortfolioWithMetadata(walletAddress);
            if (!tokens || tokens.length === 0)
                return 'No tokens found in your wallet.';
            let msg = `Here are the assets in your wallet (${walletAddress}):\n\n`;
            for (const t of tokens) {
                msg += `**${t.symbol}**`;
                if (t.symbol === 'SOL')
                    msg += ` (Native Solana)`;
                msg += `\n`;
                if (t.image)
                    msg += `![${t.symbol}](${t.image})\n`;
                msg += `Balance: ${t.balance.toFixed(4)} ${t.symbol}`;
                if (t.price > 0) {
                    msg += `\nPrice: $${t.price.toFixed(2)} USD`;
                    msg += `\nValue: $${t.balanceUsd.toFixed(2)} USD`;
                }
                if (t.mint !== SOL_MINT) {
                    msg += `\n[View on Solscan](${t.solscanUrl})`;
                }
                msg += `\n\n`;
            }
            return msg;
        }
        catch (e) {
            console.error('[UserPortfolioService] Error formatting portfolio:', e);
            return 'Failed to fetch your portfolio. Please try again.';
        }
    }
    async getUserPortfolioWithMetadata(walletAddress) {
        if (!config_1.default.HELIUS_API_KEY)
            throw new Error('HELIUS_API_KEY is not set');
        if (!walletAddress)
            throw new Error('Wallet address is required');
        // 1. Get all tokens (including SOL) from Moralis
        const moralis = (0, moralis_1.getMoralis)();
        const balances = await moralis.SolApi.account.getPortfolio({
            network: 'mainnet',
            address: walletAddress
        });
        const tokens = balances.raw.tokens || [];
        // Always include SOL
        if (balances.raw.nativeBalance) {
            // Moralis returns balances.raw.nativeBalance.solana as a string in SOL units
            const solUiAmount = Number(balances.raw.nativeBalance.solana);
            const solAmount = String(Math.round(solUiAmount * 1e9)); // lamports as string
            const solDecimals = 9;
            tokens.unshift({
                mint: 'So11111111111111111111111111111111111111112',
                amount: solAmount,
                decimals: solDecimals,
                uiAmount: solUiAmount,
                symbol: 'SOL',
                name: 'Solana',
            });
        }
        // Compute uiAmount for tokens if missing
        tokens.forEach(t => {
            if (typeof t.uiAmount === 'undefined' && t.amount && t.decimals !== undefined) {
                t.uiAmount = Number(t.amount) / Math.pow(10, t.decimals);
            }
        });
        const mints = tokens.map(t => t.mint);
        // 2. Get metadata for all mints from Helius
        const metadataList = await getHeliusMetadataBatch(mints);
        const metadataMap = {};
        metadataList.forEach(meta => {
            if (meta && meta.account)
                metadataMap[meta.account] = meta;
        });
        // 3. Get prices for all tokens from Moralis
        const prices = await Promise.all(mints.map(async (mint) => {
            try {
                const response = await moralis.SolApi.token.getTokenPrice({
                    network: 'mainnet',
                    address: mint
                });
                return { mint, price: response?.raw?.usdPrice || 0 };
            }
            catch {
                return { mint, price: 0 };
            }
        }));
        const priceMap = new Map(prices.map(p => [p.mint, p.price]));
        // 4. Merge and format for frontend
        return await Promise.all(tokens.map(async (token) => {
            const meta = metadataMap[token.mint] || {};
            const uri = meta?.onChainMetadata?.metadata?.data?.uri || meta?.offChainMetadata?.metadata?.uri;
            let image = meta?.onChainMetadata?.metadata?.data?.image ||
                meta?.offChainMetadata?.metadata?.image ||
                meta?.legacyMetadata?.logoURI ||
                '';
            if (uri)
                image = await resolveImageUrl(rewriteIpfsUri(uri));
            // Fallback for SOL if no image found
            if (token.mint === SOL_MINT && !image) {
                image = SOL_IMAGE;
            }
            const symbol = meta?.onChainMetadata?.metadata?.data?.symbol ||
                meta?.offChainMetadata?.metadata?.symbol ||
                token.symbol ||
                token.mint.slice(0, 4);
            const price = priceMap.get(token.mint) || 0;
            let balance;
            if (token.mint === SOL_MINT) {
                balance = token.uiAmount;
            }
            else if (typeof token.amount === 'string') {
                balance = parseFloat(token.amount);
            }
            else {
                balance = token.uiAmount;
            }
            const balanceUsd = price && balance ? price * balance : 0;
            return {
                symbol,
                mint: token.mint,
                price,
                image,
                solscanUrl: `https://solscan.io/token/${token.mint}`,
                balance,
                balanceUsd
            };
        })).then(arr => arr.filter(t => t.price > 0 || t.symbol === 'SOL'));
    }
}
exports.UserPortfolioService = UserPortfolioService;
