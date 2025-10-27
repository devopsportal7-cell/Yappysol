import { sendJson, enqueueAfterOpen, isWsOpen, getQueueSize } from '../lib/solanaWs';
import { logger } from '../utils/logger';
import { nextRpcId } from '../lib/rpcId';
import { rpcBus, RpcResponse } from '../lib/rpcBus';

type SubId = number;
const subs: Record<string, SubId> = {}; // pubkey -> subscriptionId (from Solana)
const pendingSubs = new Map<number, string>(); // requestId -> pubkey

/**
 * Initialize realtime service and set up RPC response handler
 */
export function initRealtime() {
  // Import here to avoid circular dependency
  import('../lib/solanaWs').then(({ getWs }) => {
    getWs();
    logger.info('[REALTIME] Initialized Solana WebSocket');
  });

  // Listen for JSON-RPC responses
  rpcBus.on('rpc:response', (id: number, payload: RpcResponse) => {
    if (!pendingSubs.has(id)) {
      // Not a subscription response we sent
      return;
    }

    const pubkey = pendingSubs.get(id)!;
    pendingSubs.delete(id);

    if (payload?.error) {
      logger.warn('[REALTIME] Subscription failed', { 
        id, 
        pubkey, 
        error: payload.error 
      });
      delete subs[pubkey];
    } else {
      const subscriptionId = payload?.result;
      if (subscriptionId) {
        subs[pubkey] = subscriptionId;
        logger.info('[REALTIME] Subscription confirmed', { 
          id, 
          pubkey, 
          subscriptionId,
          pendingCount: pendingSubs.size
        });
      } else {
        logger.warn('[REALTIME] Subscription confirmed but no subscription ID', { 
          id, 
          pubkey 
        });
      }
    }
  });
}

export function subscribeWallet(pubkey: string): void {
  logger.info('[REALTIME] Subscribing to wallet', { pubkey });
  
  enqueueAfterOpen(() => {
    const id = nextRpcId();
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
    } as const;

    pendingSubs.set(id, pubkey);
    sendJson(msg);
    logger.info('[REALTIME] Subscription request sent', { pubkey, requestId: id });
  });
}

export async function unsubscribeWallet(pubkey: string): Promise<void> {
  const subscriptionId = subs[pubkey];
  if (!subscriptionId) {
    logger.warn('[REALTIME] No subscription found for wallet', { pubkey });
    return;
  }
  
  const id = nextRpcId();
  const msg = {
    jsonrpc: '2.0',
    id,
    method: 'accountUnsubscribe',
    params: [subscriptionId]
  };
  
  sendJson(msg);
  delete subs[pubkey];
  logger.info('[REALTIME] Unsubscription sent', { pubkey, subscriptionId, requestId: id });
}

export async function subscribeWalletsBatch(pubkeys: string[], gapMs = 75): Promise<void> {
  logger.info('[REALTIME] Batch subscribing to wallets', { count: pubkeys.length, gapMs });
  
  for (const pk of pubkeys) {
    subscribeWallet(pk);
    // Add small delay between requests to avoid RPC bursts
    if (gapMs > 0) {
      await new Promise(resolve => setTimeout(resolve, gapMs));
    }
  }
  
  logger.info('[REALTIME] Batch subscription initiated', { 
    count: pubkeys.length,
    pendingConfirmations: pendingSubs.size
  });
}

/**
 * Get subscription status
 */
export function getSubscriptionStatus() {
  return {
    isConnected: isWsOpen(),
    queueSize: getQueueSize(),
    subscribedWallets: Object.keys(subs),
    subscriptionCount: Object.keys(subs).length,
    pendingSubCount: pendingSubs.size
  };
}

/**
 * Get count of pending subscription confirmations
 */
export function getPendingSubCount(): number {
  return pendingSubs.size;
}
