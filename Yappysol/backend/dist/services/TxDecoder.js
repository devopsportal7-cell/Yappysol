"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.explainParsedInstructions = explainParsedInstructions;
function explainParsedInstructions(ixs) {
    const steps = [];
    for (const ix of ixs) {
        // Minimal heuristic: list program and parsed type if present
        const pid = ('programId' in ix ? ix.programId?.toBase58?.() : undefined) || ix.programId;
        const prg = ('program' in ix ? ix.program : undefined);
        const kind = ('parsed' in ix && ix.parsed?.type) || ix.programId;
        steps.push(`Program ${prg ?? pid}: ${kind ?? 'instruction'}`);
    }
    return steps;
}
