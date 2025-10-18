import React from 'react';
import ResearchCard from './ResearchCard';

type Card = any;

export default function CompareTable({ ranked, buys, sells, disclaimer }:{ ranked: Card[]; buys: Card[]; sells: Card[]; disclaimer?: string }) {
  return (
    <div className="space-y-4">
      <div className="text-sm opacity-70">Top ideas (higher score ≈ stronger momentum/liquidity/activity). This is not financial advice.</div>
      <div className="grid md:grid-cols-2 gap-4">
        {ranked.slice(0, 6).map((c: Card) => <ResearchCard key={`${c.symbol}-${c.mint ?? ''}`} card={c} />)}
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <div className="font-medium mb-2">Potential Buys</div>
          <ul className="list-disc pl-5 text-sm">{buys.map((c:Card)=> <li key={`b-${c.symbol}`}>{c.symbol} — score {c.compositeScore}</li>)}</ul>
        </div>
        <div>
          <div className="font-medium mb-2">Potential Sells / Watch</div>
          <ul className="list-disc pl-5 text-sm">{sells.map((c:Card)=> <li key={`s-${c.symbol}`}>{c.symbol} — score {c.compositeScore}</li>)}</ul>
        </div>
      </div>
      {disclaimer ? <div className="text-xs opacity-60">{disclaimer}</div> : null}
    </div>
  );
}

