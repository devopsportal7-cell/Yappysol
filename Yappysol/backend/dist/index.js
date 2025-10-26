"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const moralis_1 = require("./lib/moralis");
const PrivyAuthService_1 = require("./services/PrivyAuthService");
const http_1 = __importDefault(require("http"));
const PORT = process.env.PORT || 3001;
(async () => {
    try {
        await (0, moralis_1.initMoralis)();
        // Initialize Privy authentication
        PrivyAuthService_1.PrivyAuthService.initialize();
        // Create HTTP server
        const server = http_1.default.createServer(app_1.default);
        // Attach WebSocket server to HTTP server
        const { frontendWebSocketServer } = await Promise.resolve().then(() => __importStar(require('./services/FrontendWebSocketServer')));
        frontendWebSocketServer.attachToServer(server);
        console.log('✅ WebSocket server attached to HTTP server');
        server.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
            console.log(`WebSocket server available at wss://your-domain.onrender.com/ws`);
            console.log(`Privy authentication: ${PrivyAuthService_1.PrivyAuthService.isPrivyConfigured() ? 'Enabled' : 'Disabled'}`);
        });
    }
    catch (error) {
        console.error('Failed to initialize services:', error);
        process.exit(1);
    }
})();
