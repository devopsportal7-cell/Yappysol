"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifySolanaSME = classifySolanaSME;
const SIG_RE = /[1-9A-HJ-NP-Za-km-z]{64,88}/; // base58-ish
const ADDR_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
function classifySolanaSME(text) {
    const q = text.toLowerCase();
    const sig = text.match(SIG_RE)?.[0];
    const addr = text.match(ADDR_RE)?.[0];
    if (/explain|decode/.test(q) && /tx|transaction/.test(q) && sig)
        return { kind: 'tx_explain', signature: sig };
    if ((/explain|what is/.test(q)) && (/account|mint|ata|pda/.test(q)) && addr)
        return { kind: 'account_explain', address: addr };
    if (/spl|token-2022|extension|freeze|mint|decimals|supply|metadata/.test(q))
        return { kind: 'spl_token_question', topic: text };
    if (/program|idl|bpf|anchor|cpi/.test(q))
        return { kind: 'program_question', topic: text };
    if (/fee|rent|compute|priority|cu limit|lamport/.test(q))
        return { kind: 'fees_rent_question', topic: text };
    if (/anchor|idl|derive|pda|account discriminator/.test(q))
        return { kind: 'anchor_question', topic: text };
    if (/solana|saga|stake|epoch|bankhash|slot|vote/.test(q))
        return { kind: 'general_solana', topic: text };
    return null;
}
