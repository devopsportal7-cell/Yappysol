"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenPriceService = void 0;
const moralis_1 = require("../lib/moralis");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Common token addresses
const COMMON_TOKENS = {
    'SOL': 'So11111111111111111111111111111111111111112',
    'BONK': 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    'RAY': '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    'SRM': 'SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt',
};
class TokenPriceService {
    constructor() {
        this.network = 'mainnet';
    }
    getTokenAddressFromQuery(query) {
        // Convert query to uppercase for case-insensitive matching
        const upperQuery = query.toUpperCase();
        // Check for common token symbols
        for (const [symbol, address] of Object.entries(COMMON_TOKENS)) {
            if (upperQuery.includes(symbol)) {
                return address;
            }
        }
        // If no common token found, check if the query contains a Solana address
        const solanaAddressRegex = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
        const match = query.match(solanaAddressRegex);
        return match ? match[0] : null;
    }
    async handlePriceQuery(query) {
        try {
            const tokenAddress = this.getTokenAddressFromQuery(query);
            if (!tokenAddress) {
                return { prompt: "I couldn't identify the token you're asking about. Please specify a token ticker (like SOL, BONK) or provide a valid contract address." };
            }
            const priceInfo = await this.getTokenPriceWithMetadata(tokenAddress);
            if (!priceInfo.usdPrice || priceInfo.nativePrice === null) {
                return { prompt: "Sorry, I couldn't get the price information for this token at the moment." };
            }
            const usd = Number(priceInfo.usdPrice);
            const sol = Number(priceInfo.nativePrice);
            const usdDisplay = usd < 0.01 ? usd.toFixed(8) : usd.toFixed(4);
            const solDisplay = sol < 0.01 ? sol.toFixed(8) : sol.toFixed(6);
            return {
                prompt: `The current price of ${priceInfo.symbol} is $${usdDisplay} USD (${solDisplay} SOL). [View on Solscan](https://solscan.io/token/${priceInfo.mint})`
            };
        }
        catch (error) {
            console.error('Error handling price query:', error);
            return { prompt: "Sorry, I couldn't fetch the price information at the moment. Please try again later." };
        }
    }
    async getTokenPrice(mint) {
        try {
            const response = await (0, moralis_1.getMoralis)().SolApi.token.getTokenPrice({
                network: this.network,
                address: mint
            });
            console.log('Moralis response:', response); // Debug: log the full response
            if (response && response.raw) {
                const data = response.raw;
                return {
                    usdPrice: data.usdPrice || 0,
                    priceChange24h: data.usdPrice24hrPercentChange || 0,
                    logo: data.logo || '',
                    name: data.name || '',
                    symbol: data.symbol || '',
                    nativePrice: data.nativePrice ? Number(data.nativePrice.value) / Math.pow(10, data.nativePrice.decimals) : null,
                    timestamp: new Date().toISOString(),
                    tokenAddress: mint
                };
            }
            return {
                usdPrice: 0,
                nativePrice: null,
                tokenAddress: mint,
                timestamp: new Date().toISOString()
            };
        }
        catch (error) {
            console.error('Error fetching token price:', error);
            return {
                usdPrice: 0,
                nativePrice: null,
                tokenAddress: mint,
                timestamp: new Date().toISOString()
            };
        }
    }
    async getTokenMetadata(tokenAddress) {
        try {
            const response = await (0, moralis_1.getMoralis)().SolApi.token.getTokenMetadata({
                network: this.network,
                address: tokenAddress,
            });
            const metadata = response.raw;
            return {
                name: metadata.name,
                symbol: metadata.symbol,
                mint: metadata.mint,
                standard: metadata.standard,
                tokenAddress,
            };
        }
        catch (error) {
            console.error('Error fetching token metadata:', error);
            throw new Error('Failed to fetch token metadata');
        }
    }
    async getTokenPriceWithMetadata(tokenAddress) {
        try {
            const [price, metadata] = await Promise.all([
                this.getTokenPrice(tokenAddress),
                this.getTokenMetadata(tokenAddress),
            ]);
            return {
                ...price,
                ...metadata,
            };
        }
        catch (error) {
            console.error('Error fetching token price and metadata:', error);
            throw new Error('Failed to fetch token price and metadata');
        }
    }
}
exports.TokenPriceService = TokenPriceService;
