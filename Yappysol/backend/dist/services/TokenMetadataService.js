"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TokenMetadataService = void 0;
const logger_1 = require("../utils/logger");
/**
 * Token metadata for popular Solana tokens
 * Used when Helius doesn't return symbol/name
 */
const KNOWN_TOKENS = {
    'So11111111111111111111111111111111111111112': {
        symbol: 'SOL',
        name: 'Solana',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
        decimals: 9
    },
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': {
        symbol: 'USDC',
        name: 'USD Coin',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
        decimals: 6
    },
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': {
        symbol: 'USDT',
        name: 'Tether',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
        decimals: 6
    },
    'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263': {
        symbol: 'BONK',
        name: 'Bonk',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
        decimals: 5
    },
    '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R': {
        symbol: 'RAY',
        name: 'Raydium',
        image: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R/logo.png',
        decimals: 6
    }
};
const STABLECOIN_PRICES = {
    'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1.0, // USDC
    'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1.0, // USDT
};
class TokenMetadataService {
    /**
     * Get token metadata (symbol, name, image) for a mint address
     */
    static getMetadata(mint) {
        const metadata = KNOWN_TOKENS[mint];
        if (metadata) {
            logger_1.logger.info('[TokenMetadata] Found metadata for', { mint, symbol: metadata.symbol });
            return metadata;
        }
        logger_1.logger.warn('[TokenMetadata] No metadata found for', { mint });
        return null;
    }
    /**
     * Get stablecoin price (always 1.0 for USDC/USDT)
     */
    static getStablecoinPrice(mint) {
        return STABLECOIN_PRICES[mint] || 0;
    }
    /**
     * Check if a mint is a stablecoin
     */
    static isStablecoin(mint) {
        return mint in STABLECOIN_PRICES;
    }
    /**
     * Enrich token data with metadata
     */
    static enrichToken(token) {
        const metadata = this.getMetadata(token.mint);
        if (metadata) {
            token.symbol = metadata.symbol;
            token.name = metadata.name;
            token.image = metadata.image;
            token.decimals = metadata.decimals || token.decimals;
        }
        // For stablecoins, set price to 1.0
        if (this.isStablecoin(token.mint)) {
            token.price = 1.0;
        }
        return token;
    }
}
exports.TokenMetadataService = TokenMetadataService;
