"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.lookupDocs = lookupDocs;
// Minimal curated index; extend over time or replace with RAG later
function lookupDocs(topic) {
    const t = topic.toLowerCase();
    const refs = [];
    let summary = 'Solana overview.';
    if (/spl|token-2022|extension|freeze|mint|decimals|supply|metadata/.test(t)) {
        summary = 'SPL Token (incl. Token-2022 extensions) concepts: mints, accounts, ATAs, authorities, extensions like transfer fee, metadata, permanent delegate, etc.';
        refs.push({ title: 'SPL Token Program', url: 'https://spl.solana.com/token' }, { title: 'Token-2022 Extensions', url: 'https://spl.solana.com/token-2022' }, { title: 'Associated Token Account', url: 'https://spl.solana.com/associated-token-account' });
    }
    else if (/fees|rent|compute|priority|cu/.test(t)) {
        summary = 'Fees & Rent: transaction fee, priority fee (compute unit price), rent-exempt balances.';
        refs.push({ title: 'Compute Budget & Priority Fees', url: 'https://docs.solana.com/developing/runtime-facilities/compute-budget' }, { title: 'Rent', url: 'https://docs.solana.com/implemented-proposals/rent' });
    }
    else if (/anchor|idl|pda|discriminator/.test(t)) {
        summary = 'Anchor basics: IDL, PDAs, account discriminators, CPI.';
        refs.push({ title: 'Anchor Book', url: 'https://book.anchor-lang.com/' }, { title: 'Solana Cookbook (PDAs)', url: 'https://solanacookbook.com/core-concepts/pdas.html' });
    }
    else {
        refs.push({ title: 'Solana Docs', url: 'https://docs.solana.com/' }, { title: 'Solana Cookbook', url: 'https://solanacookbook.com/' });
    }
    return { summary, refs };
}
