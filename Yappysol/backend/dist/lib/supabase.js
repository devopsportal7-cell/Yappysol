"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TABLES = exports.supabase = void 0;
const supabase_js_1 = require("@supabase/supabase-js");
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
// Make Supabase optional for development
let supabase = null;
exports.supabase = supabase;
if (supabaseUrl && supabaseAnonKey) {
    // Use service role key for backend operations (bypasses RLS)
    exports.supabase = supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseServiceKey || supabaseAnonKey);
    console.log('[SUPABASE] Connected to Supabase');
}
else {
    console.warn('[SUPABASE] Supabase environment variables not set. Running without database persistence.');
}
// Database table names
exports.TABLES = {
    USERS: 'users',
    WALLETS: 'wallets',
    CHAT_SESSIONS: 'chat_sessions',
    API_KEYS: 'api_keys',
    USER_SESSIONS: 'user_sessions',
    WHITELISTED_ADDRESSES: 'whitelisted_addresses',
    PASSWORD_RESET_TOKENS: 'password_reset_tokens'
};
