"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const node_fetch_1 = __importDefault(require("node-fetch"));
const web3_js_1 = require("@solana/web3.js");
const router = (0, express_1.Router)();
// Use Moralis API key from environment variables
const MORALIS_API_KEY = process.env.MORALIS_API_KEY;
const connection = new web3_js_1.Connection((0, web3_js_1.clusterApiUrl)('mainnet-beta'), 'confirmed');
router.get('/:walletAddress', async (req, res) => {
    const { walletAddress } = req.params;
    // Validate wallet address format (basic Solana address validation)
    if (!walletAddress || walletAddress.length < 32 || walletAddress.length > 44) {
        console.error('[BACKEND] Invalid wallet address format:', walletAddress);
        return res.status(400).json({ error: 'Invalid wallet address format' });
    }
    const url = `https://solana-gateway.moralis.io/account/mainnet/${walletAddress}/swaps?order=DESC`;
    console.log('[BACKEND] /api/transactions/:walletAddress called with', walletAddress);
    console.log('[BACKEND] Moralis API URL:', url);
    if (!MORALIS_API_KEY) {
        console.error('[BACKEND] Missing MORALIS_API_KEY in environment variables');
        return res.status(500).json({ error: 'Server misconfiguration: missing Moralis API key.' });
    }
    try {
        const response = await (0, node_fetch_1.default)(url, {
            method: 'GET',
            headers: {
                accept: 'application/json',
                'X-API-Key': MORALIS_API_KEY,
            },
        });
        if (!response.ok) {
            const errorText = await response.text();
            console.error('[BACKEND] Moralis API error:', errorText);
            return res.status(response.status).json({ error: errorText });
        }
        const data = await response.json();
        console.log('[BACKEND] Moralis API response for wallet', walletAddress, ':', JSON.stringify(data, null, 2));
        // Check if this is a new wallet with no transactions
        if (!data.result || data.result.length === 0) {
            console.log('[BACKEND] No transactions found for wallet:', walletAddress);
            return res.json({ result: [] });
        }
        // Log the first few transactions for debugging
        if (data.result && data.result.length > 0) {
            console.log('[BACKEND] First transaction for wallet', walletAddress, ':', JSON.stringify(data.result[0], null, 2));
        }
        res.json(data);
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error('[BACKEND] /api/transactions error:', errorMessage);
        res.status(500).json({ error: errorMessage });
    }
});
// POST /api/transactions/submit-signed
router.post('/submit-signed', async (req, res) => {
    try {
        const { signedTx, type, details } = req.body;
        if (!signedTx || !type)
            return res.status(400).json({ error: 'Missing signedTx or type' });
        const txBuffer = Buffer.from(signedTx, 'base64');
        let txid = null;
        try {
            // Send the raw transaction buffer directly (do not deserialize before sending)
            txid = await connection.sendRawTransaction(txBuffer, { skipPreflight: false });
            console.log('[BACKEND] Sent raw transaction. Signature:', txid);
        }
        catch (sendErr) {
            console.error('[BACKEND] Error sending raw transaction:', sendErr);
            // Simulate the transaction for more details
            try {
                const VersionedTransaction = require('@solana/web3.js').VersionedTransaction;
                const tx = VersionedTransaction.deserialize(txBuffer);
                const simulation = await connection.simulateTransaction(tx);
                console.error('[BACKEND] Simulation result:', simulation);
                return res.status(500).json({ error: 'Failed to send raw transaction', details: simulation });
            }
            catch (simErr) {
                console.error('[BACKEND] Simulation error:', simErr);
                return res.status(500).json({ error: 'Failed to send raw transaction', details: sendErr?.toString(), simulationError: simErr?.toString() });
            }
        }
        // Respond immediately with txid and Solscan link (do not wait for confirmation)
        const solscanLink = `https://solscan.io/tx/${txid}`;
        let prompt = '';
        let action = '';
        if (type === 'swap') {
            prompt = `🎉 Token swap submitted! [SOLSCAN_LINK]${solscanLink}[/SOLSCAN_LINK]`;
            action = 'swap';
        }
        else if (type === 'token-creation') {
            prompt = `✅ Token creation submitted!\n[View on Solscan](${details?.mint ? `https://solscan.io/token/${details.mint}` : solscanLink})`;
            action = 'token-creation';
        }
        else {
            prompt = `✅ Transaction submitted! [View on Solscan](${solscanLink})`;
            action = 'success';
        }
        return res.json({ prompt, action, txid, ...details });
    }
    catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        console.error('[BACKEND] /api/transactions/submit-signed error:', errorMessage, e);
        return res.status(500).json({ error: errorMessage, details: e?.toString() });
    }
});
exports.default = router;
