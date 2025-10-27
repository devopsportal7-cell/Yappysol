import { sendJson, enqueueAfterOpen, isWsOpen, getQueueSize } from '../lib/solanaWs';
import { logger } from '../utils/logger';

type SubId = number;
const subs: Record<string, SubId> = {};

export function initRealtime() {
  // Import here to avoid circular dependency
  import('../lib/solanaWs').then(({ getWs }) => {
    getWs();
    logger.info('[REALTIME] Initialized Solana WebSocket');
  });
}

export function subscribeWallet(pubkey: string): void {
  logger.info('[REALTIME] Subscribing to wallet', { pubkey });
  
  enqueueAfterOpen(() => {
    const id = Date.now();
    const msg = {
      jsonrpc: '2.0',
      id,
      method: 'accountSubscribe',
      params: [
        pubkey,
        {
          encoding: 'base64',
          commitment: 'confirmed'
        }
      ],
    };
    sendJson(msg);
    subs[pubkey] = id;
    logger.info('[REALTIME] Subscription request sent', { pubkey, requestId: id });
  });
}

export function unsubscribeWallet(pubkey: string): void {
  const id = subs[pubkey];
  if (!id) {
    logger.warn('[REALTIME] No subscription found for wallet', { pubkey });
    return;
  }
  
  const msg = {
    jsonrpc: '2.0',
    id: Date.now(),
    method: 'accountUnsubscribe',
    params: [id]
  };
  
  sendJson(msg);
  delete subs[pubkey];
  logger.info('[REALTIME] Unsubscription sent', { pubkey, subscriptionId: id });
}

export function subscribeWalletsBatch(pubkeys: string[]): void {
  logger.info('[REALTIME] Batch subscribing to wallets', { count: pubkeys.length });
  pubkeys.forEach(pk => subscribeWallet(pk));
}

export function getSubscriptionStatus() {
  return {
    isConnected: isWsOpen(),
    queueSize: getQueueSize(),
    subscribedWallets: Object.keys(subs),
    subscriptionCount: Object.keys(subs).length
  };
}

