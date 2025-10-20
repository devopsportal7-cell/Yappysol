"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaExpertService = void 0;
const SolanaExpertIntent_1 = require("./SolanaExpertIntent");
const RpcClient_1 = require("./RpcClient");
const TxDecoder_1 = require("./TxDecoder");
const SolanaDocsIndex_1 = require("./SolanaDocsIndex");
class SolanaExpertService {
    async answer(text) {
        const intent = (0, SolanaExpertIntent_1.classifySolanaSME)(text);
        if (!intent)
            return null;
        if (intent.kind === 'tx_explain') {
            const tx = await (0, RpcClient_1.getTx)(intent.signature);
            if (!tx)
                return { action: 'solana-expert', answer: 'Transaction not found or not parsed.', citations: [], code: '' };
            const steps = (0, TxDecoder_1.explainParsedInstructions)(tx.transaction.message.instructions);
            return {
                action: 'solana-expert',
                answer: `This transaction interacted with ${tx.transaction.message.accountKeys.length} accounts and paid ~${tx.meta?.fee} lamports in fees.`,
                details: {
                    signature: intent.signature,
                    slot: tx.slot,
                    time: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : undefined,
                    steps
                },
                citations: [{ title: 'Solana Docs: Transactions', url: 'https://docs.solana.com/developing/programming-model/transactions' }]
            };
        }
        if (intent.kind === 'account_explain') {
            const acc = await (0, RpcClient_1.getAccount)(intent.address);
            const owner = acc?.value?.owner;
            const lamports = acc?.value?.lamports;
            const data = acc?.value?.data;
            const { refs, summary } = (0, SolanaDocsIndex_1.lookupDocs)('spl token account');
            return {
                action: 'solana-expert',
                answer: `Account ${intent.address} owner: ${owner}, lamports: ${lamports}.`,
                details: { parsed: data?.parsed },
                citations: refs
            };
        }
        // SPL/Program/Fees/Anchor/General
        const doc = (0, SolanaDocsIndex_1.lookupDocs)(intent.topic || text);
        return {
            action: 'solana-expert',
            answer: doc.summary,
            citations: doc.refs,
            code: doc.code || ''
        };
    }
}
exports.SolanaExpertService = SolanaExpertService;
