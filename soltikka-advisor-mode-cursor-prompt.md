# Soltikka Advisor Mode — One‑Shot Cursor Prompt (Markdown)

This is a single, copy‑paste **master prompt** you can give to **Cursor** to implement the *Advisor Mode* feature in Soltikka without breaking existing flows. It uses **additive changes only** (new files + tiny hooks), reuses your existing data sources, and preserves current chat functionality.

---

> ## System / Project Prompt for Cursor
>
> You are a senior TypeScript full‑stack engineer working in this repo. Implement **Advisor Mode** for token research and multi‑token comparison **without breaking existing flows**. Make **additive** changes only, keep current behavior as‑is for existing features. Follow the exact steps and code below.
>
> ---
>
> ## 0) Context
> - **Backend path:** `backend/src`
> - **Frontend path:** `Fontend/src` (note the folder name)
> - **Chat entrypoint:** `backend/src/routes/chat.ts` → `ChatService.chatWithOpenAI(...)`
> - **Existing services to reuse:** `TokenPriceService`, `TrendingService`
> - **Data sources already used:** **Dexscreener (trending)**, **Moralis (price)**
>
> ## 1) Backend — Add new files
>
> **Create: `backend/src/services/AdvisorIntent.ts`**
> ```ts
> // Lightweight classifier – no new deps
> export type RiskProfile = 'conservative' | 'balanced' | 'aggressive';
> export type AdvisorIntent =
>   | { kind: 'token_research'; symbols: string[]; risk: RiskProfile }
>   | { kind: 'token_compare'; symbols: string[]; risk: RiskProfile }
>   | { kind: 'what_to_buy_sell'; symbols: string[]; risk: RiskProfile };
>
> const SYMBOL_RE = /\\b[A-Z0-9]{2,10}\\b/g;
> const MINT_RE = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
>
> function extractSymbolsOrMints(text: string): string[] {
>   const mints = text.match(MINT_RE) ?? [];
>   const syms  = (text.match(SYMBOL_RE) ?? []).filter(s => s !== 'USDC' || true); // allow USDC too
>   // De-dupe while preserving order
>   const seen = new Set<string>(); const out: string[] = [];
>   [...mints, ...syms].forEach(x => { if (!seen.has(x)) { seen.add(x); out.push(x); }});
>   return out.slice(0, 12);
> }
>
> function inferRisk(text: string): RiskProfile {
>   const t = text.toLowerCase();
>   if (t.includes('safe') || t.includes('low risk') || t.includes('stable')) return 'conservative';
>   if (t.includes('degen') || t.includes('high risk') || t.includes('moon')) return 'aggressive';
>   return 'balanced';
> }
>
> export function classifyAdvisor(text: string): AdvisorIntent | null {
>   const q = text.toLowerCase();
>   const syms = extractSymbolsOrMints(text);
>   const risk = inferRisk(text);
>   const askCompare = /(compare|vs|versus|top|best|rank|which|buy|sell|hold)/.test(q);
>   const askResearch = /(analysis|research|deep dive|explain)/.test(q);
>   if (askCompare) return { kind: 'token_compare', symbols: syms, risk };
>   if (askResearch) return { kind: 'token_research', symbols: syms.length ? syms.slice(0,1) : ['SOL'], risk };
>   if (/should i (buy|sell)|what to (buy|sell)/.test(q)) return { kind: 'what_to_buy_sell', symbols: syms, risk };
>   return null;
> }
> ```
>
> **Create: `backend/src/analytics/scoring.ts`**
> ```ts
> export type Factors = {
>   priceChange24h?: number;        // %
>   liquidityUSD?: number;          // USD
>   txns24h?: number;               // count
> };
>
> function nz(v?: number, d=0) { return (v ?? d); }
> function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
> function norm(x: number, a: number, b: number) { return clamp01((x - a) / (b - a)); }
>
> export function score(f: Factors, profile: 'conservative'|'balanced'|'aggressive'='balanced'): number {
>   // Momentum: -50%..+150% mapped to 0..1
>   const mom = norm(nz(f.priceChange24h), -50, 150);
>   // Liquidity: 0..200k mapped to 0..1
>   const liq = norm(nz(f.liquidityUSD), 0, 200_000);
>   // Activity: 0..10k txns/day mapped to 0..1
>   const act = norm(nz(f.txns24h), 0, 10_000);
>   const W = {
>     conservative: { mom:.25, liq:.55, act:.20 },
>     balanced:     { mom:.40, liq:.35, act:.25 },
>     aggressive:   { mom:.55, liq:.20, act:.25 },
>   }[profile];
>   const s = mom*W.mom + liq*W.liq + act*W.act;
>   return Math.round(s * 100);
> }
> ```
>
> **Create: `backend/src/services/AdvisorService.ts`**
> ```ts
> import axios from 'axios';
> import { score } from '../analytics/scoring';
> import { TokenPriceService } from './TokenPriceService';
> import { TrendingService } from './TrendingService';
>
> export type ResearchCard = {
>   symbol: string;
>   mint?: string;
>   name?: string;
>   priceUSD?: number;
>   change24h?: number;
>   liquidityUSD?: number;
>   txns24h?: number;
>   compositeScore: number;    // 0..100
>   notes: string[];
>   dataTimeUTC: string;
> };
>
> const COMMON: Record<string,string> = {
>   SOL:'So11111111111111111111111111111111111111112',
>   USDC:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
>   USDT:'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
>   BONK:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
>   JUP:'JUPy6bms...JUP', // leave as-is if unknown; we won’t fail on missing mint
>   JTO:'JtoXx...JTO'
> };
>
> function resolveMint(symOrMint: string): { symbol: string; mint?: string } {
>   if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(symOrMint)) return { symbol: symOrMint.slice(0,4)+'…', mint: symOrMint };
>   const sym = symOrMint.toUpperCase();
>   return { symbol: sym, mint: COMMON[sym] };
> }
>
> export class AdvisorService {
>   private price = new TokenPriceService();
>   private trending = new TrendingService();
>
>   // Use Dexscreener trending as our liquidity/activity source when available
>   private async trendingMap(): Promise<Record<string, any>> {
>     try {
>       const pairs = await this.trending.getTrending(100);
>       const map: Record<string, any> = {};
>       for (const p of pairs ?? []) {
>         const sym = p?.baseToken?.symbol?.toUpperCase?.();
>         const mint = p?.baseToken?.address;
>         if (sym) map[sym] = p;
>         if (mint) map[mint] = p;
>       }
>       return map;
>     } catch {
>       return {};
>     }
>   }
>
>   async researchOne(symbolOrMint: string, risk: 'conservative'|'balanced'|'aggressive'='balanced') {
>     const { symbol, mint } = resolveMint(symbolOrMint);
>     const tmap = await this.trendingMap();
>     const trend = tmap[mint ?? symbol];
>     let priceUSD: number | undefined;
>     let change24h: number | undefined;
>     try {
>       const info = await this.price.getTokenPriceWithMetadata(mint ?? COMMON[symbol] ?? symbol);
>       priceUSD = Number(info.usdPrice) || undefined;
>       change24h = Number((info as any).usdPrice24hrPercentChange) || undefined;
>     } catch {}
>
>     const liquidityUSD = trend?.liquidity?.usd ?? trend?.liquidity ?? undefined;
>     const txns24h = trend?.txns?.h24?.buys + trend?.txns?.h24?.sells || trend?.txns24h || undefined;
>     const computed = score({ priceChange24h: change24h ?? trend?.priceChange?.h24, liquidityUSD, txns24h }, risk);
>     const notes: string[] = [];
>     if (liquidityUSD !== undefined && liquidityUSD < 10000) notes.push('Low liquidity');
>     if ((change24h ?? 0) < -20) notes.push('Negative 24h momentum');
>     if ((txns24h ?? 0) < 50) notes.push('Low recent activity');
>
>     return {
>       symbol, mint, priceUSD, change24h, liquidityUSD, txns24h,
>       compositeScore: computed,
>       notes,
>       dataTimeUTC: new Date().toISOString(),
>       name: trend?.baseToken?.name
>     };
>   }
>
>   async compare(symbols: string[], risk: 'conservative'|'balanced'|'aggressive'='balanced') {
>     const uniq = Array.from(new Set(symbols.length ? symbols : ['SOL','JUP','JTO','BONK'])).slice(0, 8);
>     const cards = await Promise.all(uniq.map(s => this.researchOne(s, risk)));
>     const ranked = cards.sort((a,b) => b.compositeScore - a.compositeScore);
>     const buys = ranked.filter(x => x.compositeScore >= 65 && !(x.notes.includes('Low liquidity'))).slice(0,3);
>     const sells = ranked.filter(x => x.compositeScore <= 40 || x.notes.includes('Negative 24h momentum')).slice(0,3);
>     return { ranked, buys, sells };
>   }
> }
> ```
>
> ## 2) Backend — Edit `ChatService.ts` (single, safe hook)
>
> - **Add imports and properties:**
> ```ts
> import { AdvisorService } from './AdvisorService';
> import { classifyAdvisor } from './AdvisorIntent';
> // ...
> private advisorService: AdvisorService;
> ```
>
> - **Initialize in constructor():**
> ```ts
> this.advisorService = new AdvisorService();
> ```
>
> - **Inside `chatWithOpenAI(message, context)`**, after swap/create-token handling and **before** trending/general fallback, add:
> ```ts
> // Advisor intents (research / compare / buy-sell ideas)
> const adv = classifyAdvisor(message);
> if (adv) {
>   if (adv.kind === 'token_research') {
>     const card = await this.advisorService.researchOne(adv.symbols[0] ?? 'SOL', adv.risk);
>     return {
>       action: 'advisor-research',
>       prompt: `Research for ${card.symbol} (score ${card.compositeScore}/100).`,
>       advisor: { mode: 'research', card },
>       disclaimer: 'Educational market research, not financial advice.',
>       dataTimeUTC: card.dataTimeUTC
>     };
>   }
>   if (adv.kind === 'token_compare' || adv.kind === 'what_to_buy_sell') {
>     const res = await this.advisorService.compare(adv.symbols, adv.risk);
>     return {
>       action: 'advisor-compare',
>       prompt: `Ranked ideas (${adv.risk}). Top: ${res.ranked.slice(0,3).map(r=>r.symbol).join(', ')}.`,
>       advisor: { mode: 'compare', ...res },
>       disclaimer: 'Educational market research, not financial advice.',
>       dataTimeUTC: new Date().toISOString()
>     };
>   }
> }
> ```
>
> **Do not** alter any other behavior. Keep existing price/portfolio/swap/create-token/trending/general flows intact.
>
> ## 3) Frontend — Add UI components
>
> **Create: `Fontend/src/components/advisor/ResearchCard.tsx`**
> ```tsx
> import React from 'react';
> type Card = {
>   symbol: string; mint?: string; name?: string; priceUSD?: number; change24h?: number;
>   liquidityUSD?: number; txns24h?: number; compositeScore: number; notes: string[]; dataTimeUTC: string;
> };
> export default function ResearchCard({ card, disclaimer }:{ card: Card; disclaimer?: string }) {
>   return (
>     <div className="rounded-xl border p-4 bg-background/50">
>       <div className="flex items-center justify-between">
>         <div className="text-lg font-semibold">{card.name ?? card.symbol} <span className="text-sm opacity-70">({card.symbol})</span></div>
>         <div className="text-sm opacity-70">{new Date(card.dataTimeUTC).toLocaleString()}</div>
>       </div>
>       <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
>         <div><div className="opacity-60">Price (USD)</div><div className="font-medium">{card.priceUSD?.toFixed?.(4) ?? '—'}</div></div>
>         <div><div className="opacity-60">24h Change</div><div className={card.change24h!>=0?'text-emerald-600':'text-red-600'}>{card.change24h?.toFixed?.(2) ?? '—'}%</div></div>
>         <div><div className="opacity-60">Liquidity</div><div className="font-medium">${card.liquidityUSD?.toLocaleString?.() ?? '—'}</div></div>
>         <div><div className="opacity-60">Txns (24h)</div><div className="font-medium">{card.txns24h ?? '—'}</div></div>
>       </div>
>       <div className="mt-4">
>         <div className="opacity-60 text-sm mb-1">Composite Score</div>
>         <div className="w-full h-2 rounded bg-muted overflow-hidden">
>           <div className="h-full" style={{ width: `${card.compositeScore}%` }} />
>         </div>
>         <div className="text-sm mt-1">{card.compositeScore}/100</div>
>       </div>
>       {card.notes?.length ? <div className="mt-3 text-sm opacity-80">Notes: {card.notes.join(' • ')}</div> : null}
>       {disclaimer ? <div className="mt-3 text-xs opacity-60">{disclaimer}</div> : null}
>     </div>
>   );
> }
> ```
>
> **Create: `Fontend/src/components/advisor/CompareTable.tsx`**
> ```tsx
> import React from 'react';
> import ResearchCard from './ResearchCard';
> type Card = any;
> export default function CompareTable({ ranked, buys, sells, disclaimer }:{ ranked: Card[]; buys: Card[]; sells: Card[]; disclaimer?: string }) {
>   return (
>     <div className="space-y-4">
>       <div className="text-sm opacity-70">Top ideas (higher score ≈ stronger momentum/liquidity/activity). This is not financial advice.</div>
>       <div className="grid md:grid-cols-2 gap-4">
>         {ranked.slice(0, 6).map((c: Card) => <ResearchCard key={`${c.symbol}-${c.mint ?? ''}`} card={c} />)}
>       </div>
>       <div className="grid md:grid-cols-2 gap-4">
>         <div>
>           <div className="font-medium mb-2">Potential Buys</div>
>           <ul className="list-disc pl-5 text-sm">{buys.map((c:Card)=> <li key={`b-${c.symbol}`}>{c.symbol} — score {c.compositeScore}</li>)}</ul>
>         </div>
>         <div>
>           <div className="font-medium mb-2">Potential Sells / Watch</div>
>           <ul className="list-disc pl-5 text-sm">{sells.map((c:Card)=> <li key={`s-${c.symbol}`}>{c.symbol} — score {c.compositeScore}</li>)}</ul>
>         </div>
>       </div>
>       {disclaimer ? <div className="text-xs opacity-60">{disclaimer}</div> : null}
>     </div>
>   );
> }
> ```
>
> ## 4) Frontend — Edit `src/pages/Chat.tsx`
>
> - Where we append the assistant message after `sendChatMessage(...)`, intercept the new actions:
> ```tsx
> // After receiving `response` from backend
> if (response?.action === 'advisor-research' && response?.advisor?.card) {
>   addMessage({
>     id: `ai-${Date.now()}`,
>     role: 'assistant',
>     content: '',
>     action: 'advisor-research',
>     advisor: response.advisor,
>     disclaimer: response.disclaimer,
>   });
>   setIsGenerating(false);
>   return;
> }
> if (response?.action === 'advisor-compare' && response?.advisor?.ranked) {
>   addMessage({
>     id: `ai-${Date.now()}`,
>     role: 'assistant',
>     content: '',
>     action: 'advisor-compare',
>     advisor: response.advisor,
>     disclaimer: response.disclaimer,
>   });
>   setIsGenerating(false);
>   return;
> }
> ```
>
> - In the message renderer (where assistant messages are drawn), add:
> ```tsx
> import ResearchCard from '@/components/advisor/ResearchCard';
> import CompareTable from '@/components/advisor/CompareTable';
> // ...
> if (m.role === 'assistant' && m.action === 'advisor-research' && m.advisor?.card) {
>   return <ResearchCard card={m.advisor.card} disclaimer={m.disclaimer} />;
> }
> if (m.role === 'assistant' && m.action === 'advisor-compare' && m.advisor?.ranked) {
>   return <CompareTable ranked={m.advisor.ranked} buys={m.advisor.buys} sells={m.advisor.sells} disclaimer={m.disclaimer} />;
> }
> ```
>
> **Do not** change existing flows (price, portfolio, swap, create-token, trending).
>
> ## 5) Types (optional but recommended)
>
> **Extend `Fontend/src/types/chat.ts`** with:
> ```ts
> export type AdvisorResearchPayload = {
>   mode: 'research';
>   card: any;
> };
> export type AdvisorComparePayload = {
>   mode: 'compare';
>   ranked: any[];
>   buys: any[];
>   sells: any[];
> };
> ```
>
> ## 6) Config / Flags
> - No backend env changes needed (we reuse existing Moralis + Dexscreener usage).
> - Optional UI flag: add `VITE_FEATURE_ADVISOR_MODE` (default true) and guard rendering if desired.
>
> ## 7) QA checklist
> - `npm -w backend run dev` boots without TS errors.
> - `npm -w backend run build && npm -w backend start` works.
> - `npm -w Fontend run dev` compiles, chat still handles price/portfolio/swap/create-token/trending unchanged.
> - Prompts like:
>   - “Compare SOL vs JUP vs BONK for this week”
>   - “Give analysis on JTO”
>   - “What should I buy or sell today? Conservative profile”
>   render new cards/tables with disclaimer and no crashes.
>
> ## 8) Safety
> - Never output imperative financial advice; always include disclaimer string provided by backend.
> - Keep execute/simulate swap flows exactly as before; do not auto-execute anything from advisor results.
>
> **End of instructions. Make these exact changes now.**
>
> ---
>
> ### Notes
> - This plan is **additive** and low‑risk. It introduces three backend files, two frontend components, and a single safe hook in `ChatService.ts`.
> - All existing routes, schemas, and flows remain untouched.
>
> ---
>
> **Usage**: Paste this entire section into a single Cursor task and run it at the repo root.

