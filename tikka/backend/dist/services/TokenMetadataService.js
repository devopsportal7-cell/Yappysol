"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenMetadataService = void 0;
const axios_1 = __importDefault(require("axios"));
const config_1 = __importDefault(require("../config"));
const node_cache_1 = __importDefault(require("node-cache"));
class TokenMetadataService {
    constructor() {
        this.requestQueue = [];
        this.processingQueue = false;
        this.RATE_LIMIT_DELAY = 1000; // 1 second between requests
        this.CACHE_TTL = 3600; // 1 hour cache
        this.cache = new node_cache_1.default({ stdTTL: this.CACHE_TTL });
    }
    static getInstance() {
        if (!TokenMetadataService.instance) {
            TokenMetadataService.instance = new TokenMetadataService();
        }
        return TokenMetadataService.instance;
    }
    async processQueue() {
        if (this.processingQueue)
            return;
        this.processingQueue = true;
        while (this.requestQueue.length > 0) {
            const request = this.requestQueue.shift();
            if (request) {
                try {
                    await request;
                    await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
                }
                catch (error) {
                    console.error('Error processing request:', error);
                }
            }
        }
        this.processingQueue = false;
    }
    async makeRequest(mintAccounts) {
        const cacheKey = mintAccounts.sort().join(',');
        const cachedData = this.cache.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        const request = axios_1.default.post(`https://api.helius.xyz/v0/token-metadata?api-key=${config_1.default.HELIUS_API_KEY}`, {
            mintAccounts,
            includeOffChain: false,
            disableCache: false
        }).then(response => {
            const data = response.data;
            this.cache.set(cacheKey, data);
            return data;
        });
        this.requestQueue.push(request);
        this.processQueue();
        return request;
    }
    async getTokenMetadata(mint) {
        try {
            const response = await this.makeRequest([mint]);
            const metadata = response[0];
            if (!metadata) {
                throw new Error('No metadata found for token');
            }
            return {
                name: metadata.name || '',
                symbol: metadata.symbol || '',
                mint: metadata.mint || mint,
                standard: metadata.standard || '',
                tokenAddress: mint,
                uri: metadata.uri || undefined
            };
        }
        catch (error) {
            console.error('Error fetching token metadata:', error);
            return {
                name: '',
                symbol: '',
                mint,
                standard: '',
                tokenAddress: mint,
                uri: undefined
            };
        }
    }
    async getMultipleTokenMetadata(mints) {
        try {
            const response = await this.makeRequest(mints);
            return response.map((metadata) => ({
                name: metadata.name || '',
                symbol: metadata.symbol || '',
                mint: metadata.mint || '',
                standard: metadata.standard || '',
                tokenAddress: metadata.mint || '',
                uri: metadata.uri || undefined
            }));
        }
        catch (error) {
            console.error('Error fetching multiple token metadata:', error);
            return mints.map(mint => ({
                name: '',
                symbol: '',
                mint,
                standard: '',
                tokenAddress: mint,
                uri: undefined
            }));
        }
    }
}
exports.tokenMetadataService = TokenMetadataService.getInstance();
