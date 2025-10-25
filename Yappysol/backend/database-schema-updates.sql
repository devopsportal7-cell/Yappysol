-- Database Schema Updates for Yappysol Backend
-- Run these commands to fix the missing columns and tables

-- 1. Add missing columns to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 2. Create user_sessions table
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auth_type VARCHAR(10) NOT NULL CHECK (auth_type IN ('jwt', 'privy')),
    privy_token_hash VARCHAR(255),
    internal_token_hash VARCHAR(255),
    device_info TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 3. Create indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_internal_token_hash ON user_sessions(internal_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_privy_token_hash ON user_sessions(privy_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 4. Enable RLS on user_sessions
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for user_sessions
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service can manage sessions" ON user_sessions;
CREATE POLICY "Service can manage sessions" ON user_sessions
    FOR ALL USING (true);

-- 6. Add trigger for user_sessions updated_at
DROP TRIGGER IF EXISTS update_user_sessions_updated_at ON user_sessions;
CREATE TRIGGER update_user_sessions_updated_at BEFORE UPDATE ON user_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 7. Create whitelisted_addresses table (if not exists)
CREATE TABLE IF NOT EXISTS whitelisted_addresses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    address VARCHAR(44) NOT NULL,
    label VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

-- 8. Create indexes for whitelisted_addresses
CREATE INDEX IF NOT EXISTS idx_whitelisted_addresses_user_id ON whitelisted_addresses(user_id);
CREATE INDEX IF NOT EXISTS idx_whitelisted_addresses_address ON whitelisted_addresses(address);
CREATE INDEX IF NOT EXISTS idx_whitelisted_addresses_is_active ON whitelisted_addresses(is_active);

-- 9. Enable RLS on whitelisted_addresses
ALTER TABLE whitelisted_addresses ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies for whitelisted_addresses
DROP POLICY IF EXISTS "Users can manage own whitelisted addresses" ON whitelisted_addresses;
CREATE POLICY "Users can manage own whitelisted addresses" ON whitelisted_addresses
    FOR ALL USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service can manage whitelisted addresses" ON whitelisted_addresses;
CREATE POLICY "Service can manage whitelisted addresses" ON whitelisted_addresses
    FOR ALL USING (true);

-- 11. Add trigger for whitelisted_addresses updated_at
DROP TRIGGER IF EXISTS update_whitelisted_addresses_updated_at ON whitelisted_addresses;
CREATE TRIGGER update_whitelisted_addresses_updated_at BEFORE UPDATE ON whitelisted_addresses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. Create password_reset_tokens table (if not exists)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 13. Create indexes for password_reset_tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token_hash ON password_reset_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- 14. Enable RLS on password_reset_tokens
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;

-- 15. Create RLS policies for password_reset_tokens
DROP POLICY IF EXISTS "Service can manage password reset tokens" ON password_reset_tokens;
CREATE POLICY "Service can manage password reset tokens" ON password_reset_tokens
    FOR ALL USING (true);

-- 16. Update existing wallets to have is_active = true
UPDATE wallets SET is_active = TRUE WHERE is_active IS NULL;

-- 17. Create index for wallets is_active
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);
