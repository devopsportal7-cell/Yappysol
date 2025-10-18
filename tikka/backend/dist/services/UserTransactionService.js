"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserTransactionService = void 0;
const web3_js_1 = require("@solana/web3.js");
class UserTransactionService {
    constructor() {
        this.connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('mainnet-beta'), 'confirmed');
    }
    async getTransactions(walletAddress, limit = 20) {
        const pubkey = new web3_js_1.PublicKey(walletAddress);
        const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit });
        const transactions = [];
        for (const sigInfo of signatures) {
            const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
                maxSupportedTransactionVersion: 0,
            });
            if (tx) {
                transactions.push(tx);
            }
        }
        return transactions;
    }
}
exports.UserTransactionService = UserTransactionService;
