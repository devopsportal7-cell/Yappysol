import React from 'react';

type Card = {
  symbol: string; 
  mint?: string; 
  name?: string; 
  priceUSD?: number; 
  change24h?: number;
  liquidityUSD?: number; 
  txns24h?: number; 
  compositeScore: number; 
  notes: string[]; 
  dataTimeUTC: string;
};

export default function ResearchCard({ card, disclaimer }:{ card: Card; disclaimer?: string }) {
  return (
    <div className="rounded-xl border p-4 bg-background/50">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">{card.name ?? card.symbol} <span className="text-sm opacity-70">({card.symbol})</span></div>
        <div className="text-sm opacity-70">{new Date(card.dataTimeUTC).toLocaleString()}</div>
      </div>
      <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <div><div className="opacity-60">Price (USD)</div><div className="font-medium">{card.priceUSD?.toFixed?.(4) ?? '—'}</div></div>
        <div><div className="opacity-60">24h Change</div><div className={card.change24h!>=0?'text-emerald-600':'text-red-600'}>{card.change24h?.toFixed?.(2) ?? '—'}%</div></div>
        <div><div className="opacity-60">Liquidity</div><div className="font-medium">${card.liquidityUSD?.toLocaleString?.() ?? '—'}</div></div>
        <div><div className="opacity-60">Txns (24h)</div><div className="font-medium">{card.txns24h ?? '—'}</div></div>
      </div>
      <div className="mt-4">
        <div className="opacity-60 text-sm mb-1">Composite Score</div>
        <div className="w-full h-2 rounded bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500" style={{ width: `${card.compositeScore}%` }} />
        </div>
        <div className="text-sm mt-1">{card.compositeScore}/100</div>
      </div>
      {card.notes?.length ? <div className="mt-3 text-sm opacity-80">Notes: {card.notes.join(' • ')}</div> : null}
      {disclaimer ? <div className="mt-3 text-xs opacity-60">{disclaimer}</div> : null}
    </div>
  );
}

