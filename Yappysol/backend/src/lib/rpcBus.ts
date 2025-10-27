import { EventEmitter } from 'events';

export interface RpcResponse {
  id: number;
  result?: any;
  error?: any;
}

/**
 * Event bus for JSON-RPC responses
 * Allows communication between WebSocket handler and subscription services
 */
export const rpcBus = new EventEmitter();

export function onRpcResponse(id: number, payload: RpcResponse) {
  rpcBus.emit('rpc:response', id, payload);
}

