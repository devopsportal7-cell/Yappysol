"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTrendingTokensList = exports.updateTrendingTokens = exports.getTrendingTokensWithDetails = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const moralis_1 = require("../lib/moralis");
let trendingTokens = [
    { symbol: 'pizzacoin', mint: '825JDnb1VXryCM8AGZVKodgzUfowpAUw1xFDMLypump' },
    { symbol: 'HOODDRAT', mint: 'GNYLexaKyy7GHX8wiKVCmohNcuh6fvtrFkPsbVypump' },
    { symbol: 'gib', mint: '6FtbGaqgZzti1TxJksBV4PSya5of9VqA9vJNDxPwbonk' },
    { symbol: 'RooRoo', mint: '8HV9BVVvRDW2BgtqjTdX9URTD1mdSXMgVCUFYVkubonk' },
    { symbol: 'moonpig', mint: 'Ai3eKAWjzKMV8wRwd41nVP83yqfbAVJykhvJVPxspump' },
    { symbol: 'RETARD', mint: 'FtTSDNLD5mMLn3anqEQpy44cRdrtAJRrLX2MKXxfpump' },
    { symbol: 'PUP', mint: '3RUeX1TwWe4CyTRpRDfHHn2a421eTtho8yShQeCcXPUp' },
    { symbol: 'LUCK', mint: 'Ak1StSUAardZ157jSQu4hMkkoPFiUowttuowUeompump' },
    { symbol: 'SOGE', mint: 'ApmdsJcBaJZMcfH5qzJ8Ak45irYZZkTdh4zN9rFppump' },
    { symbol: 'APEX', mint: '6rE8kJHDuskmwj1MmehvwL2i4QXdLmPTYnrxJm6Cpump' }
];
let metadataCache = {};
// Helper to wait between retries
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));
async function fetchImageFromUri(uri, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios_1.default.get(uri, {
                timeout: 10000,
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'Mozilla/5.0'
                }
            });
            console.log(`[DEBUG] Fetched JSON from ${uri}:`, response.data);
            if (response.data && response.data.image) {
                return response.data.image;
            }
            else {
                console.log(`[DEBUG] No image field found in JSON from ${uri}`);
            }
        }
        catch (e) {
            const error = e;
            if (i < retries - 1) {
                const waitTime = Math.pow(2, i) * 1000;
                await wait(waitTime);
            }
            console.log(`[DEBUG] Error fetching image from ${uri}:`, error.message);
        }
    }
    return '';
}
async function getHeliusMetadataBatch(mints, retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const response = await axios_1.default.post(`https://api.helius.xyz/v0/token-metadata?api-key=${config_1.default.HELIUS_API_KEY}`, {
                mintAccounts: mints,
                includeOffChain: false,
                disableCache: false
            }, {
                headers: { 'Content-Type': 'application/json' }
            });
            if (Array.isArray(response.data)) {
                return response.data;
            }
        }
        catch (e) {
            const error = e;
            if (error.response?.status === 429 && i < retries - 1) {
                const waitTime = Math.pow(2, i) * 1000;
                console.log(`[Helius Test] Rate limited, waiting ${waitTime}ms before retry...`);
                await wait(waitTime);
            }
            else if (i === retries - 1) {
                console.error(`[Helius Test] All retries failed for mints`);
            }
        }
    }
    return [];
}
async function updateMetadataCache() {
    const mints = trendingTokens.map(t => t.mint);
    const metadataList = await getHeliusMetadataBatch(mints);
    metadataCache = {};
    metadataList.forEach(meta => {
        if (meta && meta.account)
            metadataCache[meta.account] = meta;
    });
}
// On server start, populate cache
updateMetadataCache();
function rewriteIpfsUri(uri) {
    if (uri.startsWith('ipfs://')) {
        return uri.replace('ipfs://', 'https://gateway.pinata.cloud/ipfs/');
    }
    if (uri.startsWith('https://ipfs.io/ipfs/')) {
        return uri.replace('https://ipfs.io/ipfs/', 'https://gateway.pinata.cloud/ipfs/');
    }
    return uri;
}
const getTrendingTokensWithDetails = async () => {
    // Always fetch prices live
    const prices = await Promise.all(trendingTokens.map(async (token) => {
        try {
            const response = await (0, moralis_1.getMoralis)().SolApi.token.getTokenPrice({
                network: 'mainnet',
                address: token.mint
            });
            return { mint: token.mint, price: response?.raw?.usdPrice || 0 };
        }
        catch {
            return { mint: token.mint, price: 0 };
        }
    }));
    const priceMap = new Map(prices.map(p => [p.mint, p.price]));
    // Use cached metadata
    return Promise.all(trendingTokens.map(async (token) => {
        const meta = metadataCache[token.mint] || {};
        console.log('[DEBUG] Full meta for', token.mint, JSON.stringify(meta, null, 2));
        // Extract uri from the correct path in the metadata
        const uri = meta?.onChainMetadata?.metadata?.data?.uri;
        console.log(`[DEBUG] For mint ${token.mint}, extracted uri:`, uri);
        let image = '';
        if (uri) {
            const rewrittenUri = rewriteIpfsUri(uri);
            image = await fetchImageFromUri(rewrittenUri);
        }
        return {
            symbol: meta?.onChainMetadata?.metadata?.data?.symbol || token.symbol,
            mint: token.mint,
            price: priceMap.get(token.mint) || 0,
            image,
            solscanUrl: `https://solscan.io/token/${token.mint}`
        };
    }));
};
exports.getTrendingTokensWithDetails = getTrendingTokensWithDetails;
const updateTrendingTokens = (newList) => {
    trendingTokens = newList;
    updateMetadataCache(); // Refresh cache
};
exports.updateTrendingTokens = updateTrendingTokens;
const getTrendingTokensList = () => trendingTokens;
exports.getTrendingTokensList = getTrendingTokensList;
exports.default = {
    getTrendingTokensWithDetails: exports.getTrendingTokensWithDetails,
    updateTrendingTokens: exports.updateTrendingTokens,
    getTrendingTokensList: exports.getTrendingTokensList
};
