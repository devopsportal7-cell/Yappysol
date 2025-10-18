# Solana Expert Mode — One‑Shot Cursor Prompt (Markdown)

This is a single, copy‑paste **master prompt** you can give to **Cursor** to add a **Solana + SPL Subject‑Matter Expert (SME) Mode** to your chatbot with minimal risk. It’s **additive only**: new files + a tiny hook in your existing chat service. No new public endpoints, no schema changes.

---

> ## System / Project Prompt for Cursor
>
> You are a senior TypeScript full‑stack engineer. Implement **Solana Expert Mode** for general Solana/SPL chat. Make **additive** changes only. Do **not** break existing flows. Keep using `POST /api/chat/message` and return a new `action` for SME responses.
>
> ---
>
> ## 0) Paths & constraints
> - Backend: `backend/src`
> - Frontend: `Fontend/src`
> - Chat entry: `backend/src/routes/chat.ts` → `ChatService.chatWithOpenAI(...)`
> - Reuse existing architecture. **No schema changes. No new public endpoints.**
>
> ## 1) Backend — Add files
>
> **Create: `backend/src/services/SolanaExpertIntent.ts`**
> ```ts
> export type SolanaSMEIntent =
>   | { kind: 'tx_explain'; signature: string }
>   | { kind: 'account_explain'; address: string }
>   | { kind: 'spl_token_question'; topic: string }
>   | { kind: 'program_question'; programId?: string; topic: string }
>   | { kind: 'fees_rent_question'; topic: string }
>   | { kind: 'anchor_question'; topic: string }
>   | { kind: 'general_solana'; topic: string };
>
> const SIG_RE = /[1-9A-HJ-NP-Za-km-z]{64,88}/; // base58-ish
> const ADDR_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/;
>
> export function classifySolanaSME(text: string): SolanaSMEIntent | null {
>   const q = text.toLowerCase();
>   const sig = text.match(SIG_RE)?.[0];
>   const addr = text.match(ADDR_RE)?.[0];
>   if (/explain|decode/.test(q) && /tx|transaction/.test(q) && sig) return { kind: 'tx_explain', signature: sig };
>   if ((/explain|what is/.test(q)) && (/account|mint|ata|pda/.test(q)) && addr) return { kind: 'account_explain', address: addr };
>   if (/spl|token-2022|extension|freeze|mint|decimals|supply|metadata/.test(q)) return { kind: 'spl_token_question', topic: text };
>   if (/program|idl|bpf|anchor|cpi/.test(q)) return { kind: 'program_question', topic: text };
>   if (/fee|rent|compute|priority|cu limit|lamport/.test(q)) return { kind: 'fees_rent_question', topic: text };
>   if (/anchor|idl|derive|pda|account discriminator/.test(q)) return { kind: 'anchor_question', topic: text };
>   if (/solana|saga|stake|epoch|bankhash|slot|vote/.test(q)) return { kind: 'general_solana', topic: text };
>   return null;
> }
> ```
>
> **Create: `backend/src/services/RpcClient.ts`**
> ```ts
> import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
>
> const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
> export const rpc = new Connection(rpcUrl, 'confirmed');
>
> export async function getTx(signature: string) {
>   return rpc.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
> }
> export async function getAccount(pubkey: string) {
>   const key = new PublicKey(pubkey);
>   return rpc.getParsedAccountInfo(key);
> }
> export async function getTokenAccountsByOwner(owner: string) {
>   const key = new PublicKey(owner);
>   return rpc.getParsedTokenAccountsByOwner(key, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
> }
> ```
>
> **Create: `backend/src/services/TxDecoder.ts`**
> ```ts
> import { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';
>
> export type TxExplanation = {
>   signature: string;
>   slot?: number;
>   time?: string;
>   feeLamports?: number;
>   summary: string;
>   steps: string[];
>   signers: string[];
>   programs: string[];
> };
>
> export function explainParsedInstructions(ixs: (ParsedInstruction|PartiallyDecodedInstruction)[]): string[] {
>   const steps: string[] = [];
>   for (const ix of ixs) {
>     // Minimal heuristic: list program and parsed type if present
>     const pid = ('programId' in ix ? ix.programId?.toBase58?.() : undefined) || (ix as any).programId;
>     const prg = ('program' in ix ? (ix as any).program : undefined);
>     const kind = ('parsed' in ix && (ix as any).parsed?.type) || (ix as any).programId;
>     steps.push(`Program ${prg ?? pid}: ${kind ?? 'instruction'}`);
>   }
>   return steps;
> }
> ```
>
> **Create: `backend/src/services/SolanaDocsIndex.ts`**
> ```ts
> export type DocRef = { title: string; url: string; };
> export type DocAnswer = { summary: string; refs: DocRef[]; code?: string };
>
> // Minimal curated index; extend over time or replace with RAG later
> export function lookupDocs(topic: string): DocAnswer {
>   const t = topic.toLowerCase();
>   const refs: DocRef[] = [];
>   let summary = 'Solana overview.';
>   if (/spl|token-2022|extension|freeze|mint|decimals|supply|metadata/.test(t)) {
>     summary = 'SPL Token (incl. Token-2022 extensions) concepts: mints, accounts, ATAs, authorities, extensions like transfer fee, metadata, permanent delegate, etc.';
>     refs.push(
>       { title: 'SPL Token Program', url: 'https://spl.solana.com/token' },
>       { title: 'Token-2022 Extensions', url: 'https://spl.solana.com/token-2022' },
>       { title: 'Associated Token Account', url: 'https://spl.solana.com/associated-token-account' }
>     );
>   } else if (/fees|rent|compute|priority|cu/.test(t)) {
>     summary = 'Fees & Rent: transaction fee, priority fee (compute unit price), rent-exempt balances.';
>     refs.push(
>       { title: 'Compute Budget & Priority Fees', url: 'https://docs.solana.com/developing/runtime-facilities/compute-budget' },
>       { title: 'Rent', url: 'https://docs.solana.com/implemented-proposals/rent' }
>     );
>   } else if (/anchor|idl|pda|discriminator/.test(t)) {
>     summary = 'Anchor basics: IDL, PDAs, account discriminators, CPI.';
>     refs.push(
>       { title: 'Anchor Book', url: 'https://book.anchor-lang.com/' },
>       { title: 'Solana Cookbook (PDAs)', url: 'https://solanacookbook.com/core-concepts/pdas.html' }
>     );
>   } else {
>     refs.push(
>       { title: 'Solana Docs', url: 'https://docs.solana.com/' },
>       { title: 'Solana Cookbook', url: 'https://solanacookbook.com/' }
>     );
>   }
>   return { summary, refs };
> }
> ```
>
> **Create: `backend/src/services/SolanaExpertService.ts`**
> ```ts
> import { classifySolanaSME } from './SolanaExpertIntent';
> import { getTx, getAccount } from './RpcClient';
> import { explainParsedInstructions } from './TxDecoder';
> import { lookupDocs } from './SolanaDocsIndex';
>
> export class SolanaExpertService {
>   async answer(text: string) {
>     const intent = classifySolanaSME(text);
>     if (!intent) return null;
>
>     if (intent.kind === 'tx_explain') {
>       const tx = await getTx(intent.signature);
>       if (!tx) return { action: 'solana-expert', answer: 'Transaction not found or not parsed.', citations: [], code: '' };
>       const steps = explainParsedInstructions(tx.transaction.message.instructions as any);
>       return {
>         action: 'solana-expert',
>         answer: `This transaction interacted with ${tx.transaction.message.accountKeys.length} accounts and paid ~${tx.meta?.fee} lamports in fees.`,
>         details: {
>           signature: intent.signature,
>           slot: tx.slot,
>           time: tx.blockTime ? new Date(tx.blockTime*1000).toISOString() : undefined,
>           steps
>         },
>         citations: [{ title: 'Solana Docs: Transactions', url: 'https://docs.solana.com/developing/programming-model/transactions' }]
>       };
>     }
>
>     if (intent.kind === 'account_explain') {
>       const acc = await getAccount(intent.address);
>       const owner = (acc?.value as any)?.owner;
>       const lamports = (acc?.value as any)?.lamports;
>       const data = (acc?.value as any)?.data;
>       const { refs, summary } = lookupDocs('spl token account');
>       return {
>         action: 'solana-expert',
>         answer: `Account ${intent.address} owner: ${owner}, lamports: ${lamports}.`,
>         details: { parsed: data?.parsed },
>         citations: refs
>       };
>     }
>
>     // SPL/Program/Fees/Anchor/General
>     const doc = lookupDocs((intent as any).topic || text);
>     return {
>       action: 'solana-expert',
>       answer: doc.summary,
>       citations: doc.refs,
>       code: doc.code || ''
>     };
>   }
> }
> ```
>
> ## 2) Backend — Hook into ChatService
>
> In `backend/src/services/ChatService.ts` (or wherever chat messages are routed), import and instantiate:
> ```ts
> import { SolanaExpertService } from './SolanaExpertService';
> // in constructor:
> this.solanaExpert = new SolanaExpertService();
> ```
> In the main chat handler (before the general LLM fallback), add:
> ```ts
> const sme = await this.solanaExpert.answer(message);
> if (sme) return sme; // { action: 'solana-expert', ... }
> ```
>
> ## 3) Frontend — Add components
>
> **Create: `Fontend/src/components/solana/AnswerCard.tsx`**
> ```tsx
> import React from 'react';
> export default function AnswerCard({ data }:{ data: any }) {
>   const { answer, citations, details, code } = data;
>   return (
>     <div className="rounded-xl border p-4 space-y-3">
>       <div className="text-base">{answer}</div>
>       {details ? <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto">{JSON.stringify(details, null, 2)}</pre> : null}
>       {code ? <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto">{code}</pre> : null}
>       {citations?.length ? (
>         <div className="text-xs opacity-70">
>           Sources: {citations.map((c:any,i:number)=>(<a key={i} className="underline pr-2" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>))}
>         </div>
>       ) : null}
>     </div>
>   );
> }
> ```
>
> **Edit** your chat message renderer to handle `action === 'solana-expert'` and render `<AnswerCard data={response} />`. Do **not** touch other actions.
>
> ## 4) Env & flags
> - Add `SOLANA_EXPERT_ENABLED=true`
> - Add `SOLANA_RPC_URL` (or compose with `HELIUS_API_KEY`)
> - Optional frontend flag: `VITE_FEATURE_SOLANA_EXPERT=true`
>
> ## 5) QA
> - “Explain this tx: `<signature>`” → should fetch, decode, show steps and docs link.
> - “What’s Token‑2022 transfer‑fee extension?” → shows summary + docs links.
> - “Why do I pay rent?” → fees/rent explanation + docs.
> - All existing chat flows (prices/portfolio/swap/creation/advisor) remain unchanged.
>
> **End of instructions. Make these exact changes now.**
>
> ---  
> _This is an additive feature: three small backend services, one frontend card, and a single hook in the chat service. No new routes; zero regression risk._
>
