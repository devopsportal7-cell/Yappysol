"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const moralis_1 = require("./lib/moralis");
const PrivyAuthService_1 = require("./services/PrivyAuthService");
const PORT = process.env.PORT || 3001;
(async () => {
    try {
        await (0, moralis_1.initMoralis)();
        // Initialize Privy authentication
        PrivyAuthService_1.PrivyAuthService.initialize();
        app_1.default.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
            console.log(`Privy authentication: ${PrivyAuthService_1.PrivyAuthService.isPrivyConfigured() ? 'Enabled' : 'Disabled'}`);
        });
    }
    catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
})();
