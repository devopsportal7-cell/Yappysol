let seq = 0;
const PID = Math.floor(Math.random() * 1e6); // process salt

/**
 * Monotonic-ish numeric JSON-RPC id with process salt to avoid collisions.
 * Example: 1730068412345001
 * 
 * This ensures each request has a unique ID even when multiple requests
 * are sent within the same millisecond.
 */
export function nextRpcId(): number {
  const now = Date.now();
  seq = (seq + 1) % 1_000_000; // wrap occasionally
  return Number(`${now}${(PID + seq).toString().padStart(6, '0')}`);
}

