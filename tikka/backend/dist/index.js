"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = __importDefault(require("./app"));
const moralis_1 = require("./lib/moralis");
const PORT = process.env.PORT || 3001;
(async () => {
    try {
        await (0, moralis_1.initMoralis)();
        app_1.default.listen(PORT, () => {
            console.log(`Backend server running on port ${PORT}`);
        });
    }
    catch (error) {
        console.error('Failed to initialize Moralis:', error);
        process.exit(1);
    }
})();
