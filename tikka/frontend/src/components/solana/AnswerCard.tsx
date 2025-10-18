import React from 'react';

export default function AnswerCard({ data }:{ data: any }) {
  const { answer, citations, details, code } = data;
  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div className="text-base">{answer}</div>
      {details ? <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto">{JSON.stringify(details, null, 2)}</pre> : null}
      {code ? <pre className="text-xs bg-muted/50 p-3 rounded overflow-auto">{code}</pre> : null}
      {citations?.length ? (
        <div className="text-xs opacity-70">
          Sources: {citations.map((c:any,i:number)=>(<a key={i} className="underline pr-2" href={c.url} target="_blank" rel="noreferrer">{c.title}</a>))}
        </div>
      ) : null}
    </div>
  );
}


