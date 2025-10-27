import WebSocket from 'ws';

let ws: WebSocket | null = null;
let isOpen = false;
const pending: Array<() => void> = [];

const WS_URL = process.env.SOLANA_WSS_URL ?? 'wss://api.mainnet-beta.solana.com';

const BACKOFF_START_MS = Number(process.env.WS_BACKOFF_START_MS ?? 30000);
const BACKOFF_CAP_MS   = Number(process.env.WS_BACKOFF_CAP_MS ?? 600000);
const BATCH_GAP_MS     = Number(process.env.WS_SUBSCRIBE_BATCH_MS ?? 75);

let backoffMs = BACKOFF_START_MS;
let reconnectTimer: NodeJS.Timeout | null = null;
let pingTimer: NodeJS.Timeout | null = null;
let consecutiveFailures = 0;
const MAX_CONSECUTIVE_FAILURES = 5;

export function getWs(): WebSocket {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return ws;

  log('info', '[WS] Creating new connection', { url: WS_URL });
  ws = new WebSocket(WS_URL, { handshakeTimeout: 15000 });

  ws.on('open', () => {
    isOpen = true;
    consecutiveFailures = 0;
    backoffMs = BACKOFF_START_MS;
    flushQueue();
    startHeartbeat();
    log('info', '[WS] Connected');
  });

  ws.on('message', (data: WebSocket.Data) => {
    // Route to handler if needed
    handleMessage(data.toString());
  });

  ws.on('close', (code: number, reason: Buffer) => {
    log('warn', '[WS] Connection closed', { code, reason: reason?.toString() ?? '' });
    isOpen = false;
    stopHeartbeat();
    scheduleReconnect();
  });

  ws.on('error', (err: Error) => {
    log('error', '[WS] Connection error', { error: err.message });
    isOpen = false;
    stopHeartbeat();
    scheduleReconnect();
  });

  return ws;
}

// Global message handler - can be extended
function handleMessage(data: string) {
  try {
    const msg = JSON.parse(data);
    // Handle subscription confirmations, account notifications, etc.
    // This can be routed to external handlers
  } catch (e) {
    // Ignore parse errors
  }
}

function flushQueue() {
  if (!isOpen || !ws || ws.readyState !== WebSocket.OPEN) return;
  
  const sendNext = () => {
    if (!pending.length) return;
    const fn = pending.shift()!;
    try { 
      fn(); 
    } catch (e) { 
      log('error', '[WS] Pending function error', { error: (e as Error).message }); 
    }
    setTimeout(sendNext, BATCH_GAP_MS);
  };
  
  sendNext();
}

function startHeartbeat() {
  stopHeartbeat();
  pingTimer = setInterval(() => {
    try { 
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.ping();
      }
    } catch (e) {
      log('error', '[WS] Heartbeat ping error', { error: (e as Error).message });
    }
  }, 25000);
}

function stopHeartbeat() {
  if (pingTimer) { 
    clearInterval(pingTimer); 
    pingTimer = null; 
  }
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  
  consecutiveFailures++;
  
  // Circuit breaker - stop trying after too many failures
  if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    log('error', '[WS] Too many consecutive failures, disabling WebSocket', {
      consecutiveFailures,
      message: 'WebSocket disabled. Transactions will be detected via manual refresh.'
    });
    return;
  }
  
  const jitter = Math.floor(Math.random() * 5000);
  backoffMs = Math.min(backoffMs * 2, BACKOFF_CAP_MS);
  
  log('info', '[WS] Scheduling reconnect', { backoffMs, consecutiveFailures });
  
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    try { 
      getWs(); 
    } catch (e) {
      log('error', '[WS] Reconnect failed', { error: (e as Error).message });
      scheduleReconnect();
    }
  }, backoffMs + jitter);
}

export function enqueueAfterOpen(fn: () => void) {
  if (isOpen && ws?.readyState === WebSocket.OPEN) {
    fn();
  } else {
    pending.push(fn);
    log('debug', '[WS] Message queued', { queueSize: pending.length });
  }
}

export function sendJson(obj: unknown) {
  enqueueAfterOpen(() => {
    try {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        log('warn', '[WS] Cannot send, socket not open', { state: ws?.readyState });
        return;
      }
      const data = JSON.stringify(obj);
      ws.send(data);
      log('debug', '[WS] Sent message', { msg: JSON.stringify(obj).substring(0, 100) });
    } catch (e) {
      log('error', '[WS] Send JSON error', { error: (e as Error).message });
    }
  });
}

function log(level: 'info' | 'warn' | 'error' | 'debug', msg: string, meta: Record<string, any> = {}) {
  const payload = { service: 'yappysol-backend', timestamp: new Date().toISOString(), ...meta };
  console[level](`${msg} ${JSON.stringify(payload)}`);
}

// Export connection status for diagnostics
export function isWsOpen(): boolean {
  return isOpen && ws !== null && ws.readyState === WebSocket.OPEN;
}

export function getQueueSize(): number {
  return pending.length;
}

