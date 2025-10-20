// In-memory session storage (replace with actual Redis in production)
const sessions: { [key: string]: any } = {};

export async function setSwapSession(userId: string, session: any): Promise<void> {
  sessions[userId] = session;
}

export async function getSwapSession(userId: string): Promise<any> {
  return sessions[userId];
}

export async function clearSwapSession(userId: string): Promise<void> {
  delete sessions[userId];
} 