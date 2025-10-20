import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

export class UserTransactionService {
  private connection: Connection;

  constructor() {
    this.connection = new Connection(clusterApiUrl('mainnet-beta'), 'confirmed');
  }

  async getTransactions(walletAddress: string, limit = 20) {
    const pubkey = new PublicKey(walletAddress);
    const signatures = await this.connection.getSignaturesForAddress(pubkey, { limit });
    const transactions = [];
    for (const sigInfo of signatures) {
      const tx = await this.connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });
      if (tx) {
        transactions.push(tx);
      }
    }
    return transactions;
  }
} 