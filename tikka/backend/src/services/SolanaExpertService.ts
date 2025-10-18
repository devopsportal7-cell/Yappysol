import { classifySolanaSME } from './SolanaExpertIntent';
import { getTx, getAccount } from './RpcClient';
import { explainParsedInstructions } from './TxDecoder';
import { lookupDocs } from './SolanaDocsIndex';

export class SolanaExpertService {
  async answer(text: string) {
    const intent = classifySolanaSME(text);
    if (!intent) return null;

    if (intent.kind === 'tx_explain') {
      const tx = await getTx(intent.signature);
      if (!tx) return { action: 'solana-expert', answer: 'Transaction not found or not parsed.', citations: [], code: '' };
      const steps = explainParsedInstructions(tx.transaction.message.instructions as any);
      return {
        action: 'solana-expert',
        answer: `This transaction interacted with ${tx.transaction.message.accountKeys.length} accounts and paid ~${tx.meta?.fee} lamports in fees.`,
        details: {
          signature: intent.signature,
          slot: tx.slot,
          time: tx.blockTime ? new Date(tx.blockTime*1000).toISOString() : undefined,
          steps
        },
        citations: [{ title: 'Solana Docs: Transactions', url: 'https://docs.solana.com/developing/programming-model/transactions' }]
      };
    }

    if (intent.kind === 'account_explain') {
      const acc = await getAccount(intent.address);
      const owner = (acc?.value as any)?.owner;
      const lamports = (acc?.value as any)?.lamports;
      const data = (acc?.value as any)?.data;
      const { refs, summary } = lookupDocs('spl token account');
      return {
        action: 'solana-expert',
        answer: `Account ${intent.address} owner: ${owner}, lamports: ${lamports}.`,
        details: { parsed: data?.parsed },
        citations: refs
      };
    }

    // SPL/Program/Fees/Anchor/General
    const doc = lookupDocs((intent as any).topic || text);
    return {
      action: 'solana-expert',
      answer: doc.summary,
      citations: doc.refs,
      code: doc.code || ''
    };
  }
}

