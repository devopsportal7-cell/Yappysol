"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMoralis = exports.initMoralis = exports.moralisService = void 0;
const moralis_1 = __importDefault(require("moralis"));
const config_1 = __importDefault(require("../config"));
class MoralisService {
    constructor() {
        this.isInitialized = false;
        this.initializationPromise = null;
    }
    static getInstance() {
        if (!MoralisService.instance) {
            MoralisService.instance = new MoralisService();
        }
        return MoralisService.instance;
    }
    async initialize() {
        if (this.isInitialized) {
            return;
        }
        if (this.initializationPromise) {
            return this.initializationPromise;
        }
        this.initializationPromise = (async () => {
            try {
                await moralis_1.default.start({
                    apiKey: config_1.default.MORALIS_API_KEY
                });
                this.isInitialized = true;
                console.log('Moralis initialized successfully');
            }
            catch (error) {
                console.error('Failed to initialize Moralis:', error);
                this.isInitialized = false;
                this.initializationPromise = null;
                throw error;
            }
        })();
        return this.initializationPromise;
    }
    getMoralis() {
        if (!this.isInitialized) {
            throw new Error('Moralis not initialized. Call initialize() first.');
        }
        return moralis_1.default;
    }
}
// Export singleton instance
exports.moralisService = MoralisService.getInstance();
// Export convenience functions
const initMoralis = () => exports.moralisService.initialize();
exports.initMoralis = initMoralis;
const getMoralis = () => exports.moralisService.getMoralis();
exports.getMoralis = getMoralis;
exports.default = moralis_1.default;
