-- External Wallet Deposit Balance System Database Schema
-- This schema supports real-time balance updates when users receive deposits from external wallets

-- External Transactions Table
CREATE TABLE IF NOT EXISTS external_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    signature TEXT NOT NULL UNIQUE,
    block_time BIGINT NOT NULL,
    amount DECIMAL(20, 9) NOT NULL,
    token_mint TEXT NOT NULL,
    token_symbol TEXT NOT NULL,
    token_name TEXT,
    sender TEXT NOT NULL,
    recipient TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('SOL', 'SPL')),
    value_usd DECIMAL(20, 9),
    solscan_url TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Wallet Balance Cache Table (totals)
CREATE TABLE IF NOT EXISTS wallet_balance_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    total_sol_value DECIMAL(20, 9) DEFAULT 0,
    total_usd_value DECIMAL(20, 9) DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Individual Token Balances Cache Table
CREATE TABLE IF NOT EXISTS token_balance_cache (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    token_mint VARCHAR(255) NOT NULL,
    token_symbol VARCHAR(50) NOT NULL,
    token_name VARCHAR(255),
    account_unit VARCHAR(255) NOT NULL,
    ui_amount DECIMAL(20, 9) NOT NULL,
    price_usd DECIMAL(20, 9) DEFAULT 0,
    sol_equivalent DECIMAL(20, 9) DEFAULT 0,
    usd_equivalent DECIMAL(20, 9) DEFAULT 0,
    token_image TEXT,
    solscan_url TEXT,
    decimals INTEGER DEFAULT 9,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_wallet_token UNIQUE (wallet_address, token_mint)
);

-- Balance Update Events Table
CREATE TABLE IF NOT EXISTS balance_update_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('send', 'receive', 'manual_refresh', 'transaction', 'external_deposit')),
    transaction_hash VARCHAR(255),
    affected_tokens TEXT[],
    processed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Platform Wallets Table (to identify internal vs external transactions)
CREATE TABLE IF NOT EXISTS platform_wallets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    wallet_address VARCHAR(255) NOT NULL UNIQUE,
    wallet_type VARCHAR(50) NOT NULL CHECK (wallet_type IN ('user', 'system', 'treasury', 'fee_collector')),
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_external_transactions_user_id ON external_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_external_transactions_signature ON external_transactions(signature);
CREATE INDEX IF NOT EXISTS idx_external_transactions_recipient ON external_transactions(recipient);
CREATE INDEX IF NOT EXISTS idx_external_transactions_block_time ON external_transactions(block_time);

CREATE INDEX IF NOT EXISTS idx_wallet_balance_cache_address ON wallet_balance_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_wallet_balance_cache_updated ON wallet_balance_cache(last_updated);

CREATE INDEX IF NOT EXISTS idx_token_balance_cache_address ON token_balance_cache(wallet_address);
CREATE INDEX IF NOT EXISTS idx_token_balance_cache_mint ON token_balance_cache(token_mint);
CREATE INDEX IF NOT EXISTS idx_token_balance_cache_updated ON token_balance_cache(last_updated);

CREATE INDEX IF NOT EXISTS idx_balance_update_events_address ON balance_update_events(wallet_address);
CREATE INDEX IF NOT EXISTS idx_balance_update_events_processed ON balance_update_events(processed);
CREATE INDEX IF NOT EXISTS idx_balance_update_events_type ON balance_update_events(event_type);

CREATE INDEX IF NOT EXISTS idx_platform_wallets_address ON platform_wallets(wallet_address);
CREATE INDEX IF NOT EXISTS idx_platform_wallets_type ON platform_wallets(wallet_type);

-- Row Level Security (RLS) Policies
ALTER TABLE external_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wallet_balance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_balance_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE balance_update_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for external_transactions
CREATE POLICY "Users can view their own external transactions" ON external_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage external transactions" ON external_transactions
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for wallet_balance_cache
CREATE POLICY "Users can view wallet balance cache" ON wallet_balance_cache
    FOR SELECT USING (true); -- Allow read access for balance checks

CREATE POLICY "Service role can manage wallet balance cache" ON wallet_balance_cache
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for token_balance_cache
CREATE POLICY "Users can view token balance cache" ON token_balance_cache
    FOR SELECT USING (true); -- Allow read access for balance checks

CREATE POLICY "Service role can manage token balance cache" ON token_balance_cache
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for balance_update_events
CREATE POLICY "Service role can manage balance update events" ON balance_update_events
    FOR ALL USING (auth.role() = 'service_role');

-- RLS Policies for platform_wallets
CREATE POLICY "Users can view platform wallets" ON platform_wallets
    FOR SELECT USING (true);

CREATE POLICY "Service role can manage platform wallets" ON platform_wallets
    FOR ALL USING (auth.role() = 'service_role');

-- Functions for automatic timestamp updates
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_external_transactions_updated_at BEFORE UPDATE ON external_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_platform_wallets_updated_at BEFORE UPDATE ON platform_wallets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default platform wallets (you can modify these based on your platform)
INSERT INTO platform_wallets (wallet_address, wallet_type, description) VALUES
    ('11111111111111111111111111111112', 'system', 'System Program'),
    ('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA', 'system', 'Token Program'),
    ('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL', 'system', 'Associated Token Program')
ON CONFLICT (wallet_address) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE external_transactions IS 'Stores transactions from external wallets (not platform wallets)';
COMMENT ON TABLE wallet_balance_cache IS 'Caches total wallet balances for performance';
COMMENT ON TABLE token_balance_cache IS 'Caches individual token balances for each wallet';
COMMENT ON TABLE balance_update_events IS 'Tracks balance update events for processing';
COMMENT ON TABLE platform_wallets IS 'Identifies platform-owned wallets to filter external transactions';

