import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Make Supabase optional for development
let supabase: any = null;

if (supabaseUrl && supabaseAnonKey) {
  // Use service role key for backend operations (bypasses RLS)
  supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
  console.log('[SUPABASE] Connected to Supabase');
} else {
  console.warn('[SUPABASE] Supabase environment variables not set. Running without database persistence.');
}

export { supabase };

// Database table names
export const TABLES = {
  USERS: 'users',
  WALLETS: 'wallets',
  CHAT_SESSIONS: 'chat_sessions',
  API_KEYS: 'api_keys',
  USER_SESSIONS: 'user_sessions'
} as const;
