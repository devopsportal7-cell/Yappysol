import axios from 'axios';
import { score } from '../analytics/scoring';
import { TokenPriceService } from './TokenPriceService';
import { TrendingService } from './TrendingService';

export type ResearchCard = {
  symbol: string;
  mint?: string;
  name?: string;
  priceUSD?: number;
  change24h?: number;
  liquidityUSD?: number;
  txns24h?: number;
  compositeScore: number;    // 0..100
  notes: string[];
  dataTimeUTC: string;
};

const COMMON: Record<string,string> = {
  SOL:'So11111111111111111111111111111111111111112',
  USDC:'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT:'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK:'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  JUP:'JUPy6bms...JUP', // leave as-is if unknown; we won't fail on missing mint
  JTO:'JtoXx...JTO'
};

function resolveMint(symOrMint: string): { symbol: string; mint?: string } {
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(symOrMint)) return { symbol: symOrMint.slice(0,4)+'…', mint: symOrMint };
  const sym = symOrMint.toUpperCase();
  return { symbol: sym, mint: COMMON[sym] };
}

export class AdvisorService {
  private price = new TokenPriceService();
  private trending = new TrendingService();

  // Use Dexscreener trending as our liquidity/activity source when available
  private async trendingMap(): Promise<Record<string, any>> {
    try {
      const pairs = await this.trending.getTrending(100);
      const map: Record<string, any> = {};
      for (const p of pairs ?? []) {
        const sym = p?.baseToken?.symbol?.toUpperCase?.();
        const mint = p?.baseToken?.address;
        if (sym) map[sym] = p;
        if (mint) map[mint] = p;
      }
      return map;
    } catch {
      return {};
    }
  }

  async researchOne(symbolOrMint: string, risk: 'conservative'|'balanced'|'aggressive'='balanced') {
    const { symbol, mint } = resolveMint(symbolOrMint);
    const tmap = await this.trendingMap();
    const trend = tmap[mint ?? symbol];
    let priceUSD: number | undefined;
    let change24h: number | undefined;
    try {
      const info = await this.price.getTokenPriceWithMetadata(mint ?? COMMON[symbol] ?? symbol);
      priceUSD = Number(info.usdPrice) || undefined;
      change24h = Number((info as any).usdPrice24hrPercentChange) || undefined;
    } catch {}

    const liquidityUSD = trend?.liquidity?.usd ?? trend?.liquidity ?? undefined;
    const txns24h = trend?.txns?.h24?.buys + trend?.txns?.h24?.sells || trend?.txns24h || undefined;
    const computed = score({ priceChange24h: change24h ?? trend?.priceChange?.h24, liquidityUSD, txns24h }, risk);
    const notes: string[] = [];
    if (liquidityUSD !== undefined && liquidityUSD < 10000) notes.push('Low liquidity');
    if ((change24h ?? 0) < -20) notes.push('Negative 24h momentum');
    if ((txns24h ?? 0) < 50) notes.push('Low recent activity');

    return {
      symbol, mint, priceUSD, change24h, liquidityUSD, txns24h,
      compositeScore: computed,
      notes,
      dataTimeUTC: new Date().toISOString(),
      name: trend?.baseToken?.name
    };
  }

  async compare(symbols: string[], risk: 'conservative'|'balanced'|'aggressive'='balanced') {
    const uniq = Array.from(new Set(symbols.length ? symbols : ['SOL','JUP','JTO','BONK'])).slice(0, 8);
    const cards = await Promise.all(uniq.map(s => this.researchOne(s, risk)));
    const ranked = cards.sort((a,b) => b.compositeScore - a.compositeScore);
    const buys = ranked.filter(x => x.compositeScore >= 65 && !(x.notes.includes('Low liquidity'))).slice(0,3);
    const sells = ranked.filter(x => x.compositeScore <= 40 || x.notes.includes('Negative 24h momentum')).slice(0,3);
    return { ranked, buys, sells };
  }
}

