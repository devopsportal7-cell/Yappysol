export type Factors = {
  priceChange24h?: number;        // %
  liquidityUSD?: number;          // USD
  txns24h?: number;               // count
};

function nz(v?: number, d=0) { return (v ?? d); }
function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }
function norm(x: number, a: number, b: number) { return clamp01((x - a) / (b - a)); }

export function score(f: Factors, profile: 'conservative'|'balanced'|'aggressive'='balanced'): number {
  // Momentum: -50%..+150% mapped to 0..1
  const mom = norm(nz(f.priceChange24h), -50, 150);
  // Liquidity: 0..200k mapped to 0..1
  const liq = norm(nz(f.liquidityUSD), 0, 200_000);
  // Activity: 0..10k txns/day mapped to 0..1
  const act = norm(nz(f.txns24h), 0, 10_000);
  const W = {
    conservative: { mom:.25, liq:.55, act:.20 },
    balanced:     { mom:.40, liq:.35, act:.25 },
    aggressive:   { mom:.55, liq:.20, act:.25 },
  }[profile];
  const s = mom*W.mom + liq*W.liq + act*W.act;
  return Math.round(s * 100);
}

