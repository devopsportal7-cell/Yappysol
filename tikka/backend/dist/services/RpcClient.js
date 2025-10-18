"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rpc = void 0;
exports.getTx = getTx;
exports.getAccount = getAccount;
exports.getTokenAccountsByOwner = getTokenAccountsByOwner;
const web3_js_1 = require("@solana/web3.js");
const rpcUrl = process.env.SOLANA_RPC_URL || (0, web3_js_1.clusterApiUrl)('mainnet-beta');
exports.rpc = new web3_js_1.Connection(rpcUrl, 'confirmed');
async function getTx(signature) {
    return exports.rpc.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
}
async function getAccount(pubkey) {
    const key = new web3_js_1.PublicKey(pubkey);
    return exports.rpc.getParsedAccountInfo(key);
}
async function getTokenAccountsByOwner(owner) {
    const key = new web3_js_1.PublicKey(owner);
    return exports.rpc.getParsedTokenAccountsByOwner(key, { programId: new web3_js_1.PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
}
