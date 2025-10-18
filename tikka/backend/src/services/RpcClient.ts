import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';

const rpcUrl = process.env.SOLANA_RPC_URL || clusterApiUrl('mainnet-beta');
export const rpc = new Connection(rpcUrl, 'confirmed');

export async function getTx(signature: string) {
  return rpc.getParsedTransaction(signature, { maxSupportedTransactionVersion: 0 });
}

export async function getAccount(pubkey: string) {
  const key = new PublicKey(pubkey);
  return rpc.getParsedAccountInfo(key);
}

export async function getTokenAccountsByOwner(owner: string) {
  const key = new PublicKey(owner);
  return rpc.getParsedTokenAccountsByOwner(key, { programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA') });
}

