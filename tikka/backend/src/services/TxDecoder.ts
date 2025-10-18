import { ParsedInstruction, PartiallyDecodedInstruction } from '@solana/web3.js';

export type TxExplanation = {
  signature: string;
  slot?: number;
  time?: string;
  feeLamports?: number;
  summary: string;
  steps: string[];
  signers: string[];
  programs: string[];
};

export function explainParsedInstructions(ixs: (ParsedInstruction|PartiallyDecodedInstruction)[]): string[] {
  const steps: string[] = [];
  for (const ix of ixs) {
    // Minimal heuristic: list program and parsed type if present
    const pid = ('programId' in ix ? ix.programId?.toBase58?.() : undefined) || (ix as any).programId;
    const prg = ('program' in ix ? (ix as any).program : undefined);
    const kind = ('parsed' in ix && (ix as any).parsed?.type) || (ix as any).programId;
    steps.push(`Program ${prg ?? pid}: ${kind ?? 'instruction'}`);
  }
  return steps;
}

