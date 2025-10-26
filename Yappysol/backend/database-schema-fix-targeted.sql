-- Targeted Database Schema Fixes
-- Run these commands one by one to fix the specific errors

-- 1. First, check if user_sessions table exists and what columns it has
-- Run this to see the current structure:
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_sessions';

-- 2. Add missing columns to user_sessions table (if it exists)
-- Add internal_token_hash column if it doesn't exist
DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_sessions') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'internal_token_hash') THEN
            ALTER TABLE user_sessions ADD COLUMN internal_token_hash VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'privy_token_hash') THEN
            ALTER TABLE user_sessions ADD COLUMN privy_token_hash VARCHAR(255);
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'auth_type') THEN
            ALTER TABLE user_sessions ADD COLUMN auth_type VARCHAR(10) CHECK (auth_type IN ('jwt', 'privy'));
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'device_info') THEN
            ALTER TABLE user_sessions ADD COLUMN device_info TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'ip_address') THEN
            ALTER TABLE user_sessions ADD COLUMN ip_address INET;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'user_agent') THEN
            ALTER TABLE user_sessions ADD COLUMN user_agent TEXT;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'expires_at') THEN
            ALTER TABLE user_sessions ADD COLUMN expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (NOW() + INTERVAL '24 hours');
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'last_accessed_at') THEN
            ALTER TABLE user_sessions ADD COLUMN last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_sessions' AND column_name = 'is_active') THEN
            ALTER TABLE user_sessions ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        END IF;
    ELSE
        -- Create the table if it doesn't exist
        CREATE TABLE user_sessions (
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
    END IF;
END $$;

-- 3. Add missing columns to wallets table
ALTER TABLE wallets ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

-- 4. Create indexes for user_sessions (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_internal_token_hash ON user_sessions(internal_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_privy_token_hash ON user_sessions(privy_token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_is_active ON user_sessions(is_active);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- 5. Enable RLS on user_sessions (if not already enabled)
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies for user_sessions (drop and recreate to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own sessions" ON user_sessions;
CREATE POLICY "Users can view own sessions" ON user_sessions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service can manage sessions" ON user_sessions;
CREATE POLICY "Service can manage sessions" ON user_sessions
    FOR ALL USING (true);

-- 7. Create index for wallets is_active
CREATE INDEX IF NOT EXISTS idx_wallets_is_active ON wallets(is_active);

-- 8. Update existing wallets to have is_active = true
UPDATE wallets SET is_active = TRUE WHERE is_active IS NULL;

