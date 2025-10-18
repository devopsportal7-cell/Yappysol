"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyAdvisor = classifyAdvisor;
const SYMBOL_RE = /\b[A-Z0-9]{2,10}\b/g;
const MINT_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
function extractSymbolsOrMints(text) {
    const mints = text.match(MINT_RE) ?? [];
    const syms = (text.match(SYMBOL_RE) ?? []).filter(s => s !== 'USDC' || true); // allow USDC too
    // De-dupe while preserving order
    const seen = new Set();
    const out = [];
    [...mints, ...syms].forEach(x => { if (!seen.has(x)) {
        seen.add(x);
        out.push(x);
    } });
    return out.slice(0, 12);
}
function inferRisk(text) {
    const t = text.toLowerCase();
    if (t.includes('safe') || t.includes('low risk') || t.includes('stable'))
        return 'conservative';
    if (t.includes('degen') || t.includes('high risk') || t.includes('moon'))
        return 'aggressive';
    return 'balanced';
}
function classifyAdvisor(text) {
    const q = text.toLowerCase();
    const syms = extractSymbolsOrMints(text);
    const risk = inferRisk(text);
    const askCompare = /(compare|vs|versus|top|best|rank|which|buy|sell|hold)/.test(q);
    const askResearch = /(analysis|research|deep dive|explain)/.test(q);
    if (askCompare)
        return { kind: 'token_compare', symbols: syms, risk };
    if (askResearch)
        return { kind: 'token_research', symbols: syms.length ? syms.slice(0, 1) : ['SOL'], risk };
    if (/should i (buy|sell)|what to (buy|sell)/.test(q))
        return { kind: 'what_to_buy_sell', symbols: syms, risk };
    return null;
}
