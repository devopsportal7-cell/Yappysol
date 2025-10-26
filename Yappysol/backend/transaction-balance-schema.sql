 -- Transaction-based balance tracking schema
-- Add this to your database-schema-fix-targeted.sql

-- Transaction logs table for audit trail
CREATE TABLE IF NOT EXISTS transaction_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature VARCHAR(255) NOT NULL UNIQUE,
    wallet_address VARCHAR(44) NOT NULL,
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('debit', 'credit')),
    amount DECIMAL(20, 9) NOT NULL,
    token_mint VARCHAR(44) NOT NULL,
    token_symbol VARCHAR(50) NOT NULL,
    block_time BIGINT NOT NULL,
    slot BIGINT NOT NULL,
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add last_transaction_signature to token_balance_cache
ALTER TABLE token_balance_cache ADD COLUMN IF NOT EXISTS last_transaction_signature VARCHAR(255);

-- Indexes for transaction logs
CREATE INDEX IF NOT EXISTS idx_transaction_logs_wallet_address ON transaction_logs(wallet_address);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_signature ON transaction_logs(signature);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_processed_at ON transaction_logs(processed_at);
CREATE INDEX IF NOT EXISTS idx_transaction_logs_token_mint ON transaction_logs(token_mint);

-- Index for token balance cache
CREATE INDEX IF NOT EXISTS idx_token_balance_last_transaction ON token_balance_cache(last_transaction_signature);

-- Enable RLS on transaction_logs
ALTER TABLE transaction_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for transaction_logs
DROP POLICY IF EXISTS "Users can view own transaction logs" ON transaction_logs;
CREATE POLICY "Users can view own transaction logs" ON transaction_logs
    FOR SELECT USING (
        wallet_address IN (
            SELECT public_key FROM wallets WHERE user_id::text = auth.uid()::text
        )
    );

DROP POLICY IF EXISTS "Service can manage transaction logs" ON transaction_logs;
CREATE POLICY "Service can manage transaction logs" ON transaction_logs
    FOR ALL USING (true);
