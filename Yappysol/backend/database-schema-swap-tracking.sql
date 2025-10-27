-- Swap Transaction Tracking Schema
-- This schema tracks all swap transactions performed through Yappysol

-- 1. Create swap_transactions table
CREATE TABLE IF NOT EXISTS swap_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    
    -- Swap details
    from_token_mint VARCHAR(44) NOT NULL,
    from_token_symbol VARCHAR(10),
    from_token_amount DECIMAL(20, 9) NOT NULL,
    
    to_token_mint VARCHAR(44) NOT NULL,
    to_token_symbol VARCHAR(10),
    to_token_amount DECIMAL(20, 9),
    
    -- Transaction details
    transaction_signature VARCHAR(88) NOT NULL UNIQUE,
    solscan_url TEXT,
    
    -- Execution details
    execution_provider VARCHAR(20) NOT NULL CHECK (execution_provider IN ('pumpportal', 'jupiter', 'pump', 'bonk', 'raydium')),
    slippage_bps INTEGER DEFAULT 50,
    priority_fee DECIMAL(20, 9),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed', 'reverted')),
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    confirmed_at TIMESTAMP WITH TIME ZONE,
    
    -- Additional fields
    block_time TIMESTAMP WITH TIME ZONE,
    fee_amount DECIMAL(20, 9),
    notes TEXT
);

-- 2. Create indexes for swap_transactions
CREATE INDEX IF NOT EXISTS idx_swap_transactions_user_id ON swap_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_wallet_id ON swap_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_transaction_signature ON swap_transactions(transaction_signature);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_from_token_mint ON swap_transactions(from_token_mint);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_to_token_mint ON swap_transactions(to_token_mint);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_status ON swap_transactions(status);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_created_at ON swap_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_swap_transactions_execution_provider ON swap_transactions(execution_provider);

-- 3. Enable RLS on swap_transactions
ALTER TABLE swap_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for swap_transactions
DROP POLICY IF EXISTS "Users can view own swap transactions" ON swap_transactions;
CREATE POLICY "Users can view own swap transactions" ON swap_transactions
    FOR SELECT USING (auth.uid()::text = user_id::text);

DROP POLICY IF EXISTS "Service can manage swap transactions" ON swap_transactions;
CREATE POLICY "Service can manage swap transactions" ON swap_transactions
    FOR ALL USING (true);

-- 5. Create function to update updated_at
DROP TRIGGER IF EXISTS update_swap_transactions_updated_at ON swap_transactions;
CREATE TRIGGER update_swap_transactions_updated_at 
    BEFORE UPDATE ON swap_transactions
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 6. Create swap_analytics view (for reporting)
CREATE OR REPLACE VIEW swap_analytics AS
SELECT 
    user_id,
    DATE_TRUNC('day', created_at) as swap_date,
    COUNT(*) as total_swaps,
    COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as successful_swaps,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_swaps,
    SUM(CASE WHEN status = 'confirmed' THEN from_token_amount ELSE 0 END) as total_volume_from,
    SUM(CASE WHEN status = 'confirmed' THEN to_token_amount ELSE 0 END) as total_volume_to,
    AVG(CASE WHEN status = 'confirmed' THEN fee_amount ELSE NULL END) as avg_fee,
    STRING_AGG(DISTINCT execution_provider, ', ') as used_providers
FROM swap_transactions
GROUP BY user_id, DATE_TRUNC('day', created_at);

COMMENT ON TABLE swap_transactions IS 'Tracks all swap transactions performed by users';
COMMENT ON VIEW swap_analytics IS 'Aggregated swap statistics for users';

