-- Token Launch Database Schema
-- Run this SQL in your Supabase SQL editor

-- 1. Token Launches Table
CREATE TABLE token_launches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id UUID REFERENCES chat_sessions(id) ON DELETE SET NULL,
  
  -- Token Details
  token_name VARCHAR(100) NOT NULL,
  token_symbol VARCHAR(20) NOT NULL,
  description TEXT,
  image_url TEXT,
  
  -- Social Links
  twitter_url TEXT,
  telegram_url TEXT,
  website_url TEXT,
  
  -- Launch Configuration
  pool_type VARCHAR(20) NOT NULL CHECK (pool_type IN ('pump', 'bonk')),
  launch_amount DECIMAL(20, 9) NOT NULL,
  initial_supply BIGINT,
  decimals INTEGER DEFAULT 9,
  
  -- Transaction Details
  mint_address VARCHAR(44) UNIQUE,
  transaction_signature VARCHAR(88),
  unsigned_transaction TEXT,
  
  -- Price & Market Data (updated via cron job)
  current_price_usd DECIMAL(20, 9) DEFAULT 0,
  market_cap_usd DECIMAL(20, 2) DEFAULT 0,
  price_change_24h DECIMAL(10, 4) DEFAULT 0,
  volume_24h_usd DECIMAL(20, 2) DEFAULT 0,
  liquidity_usd DECIMAL(20, 2) DEFAULT 0,
  holders_count INTEGER DEFAULT 0,
  
  -- Status Tracking
  status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'pending', 'completed', 'failed', 'cancelled')),
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  last_price_update TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Token Prices History Table (for price tracking over time)
CREATE TABLE token_prices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token_launch_id UUID NOT NULL REFERENCES token_launches(id) ON DELETE CASCADE,
  mint_address VARCHAR(44) NOT NULL,
  
  -- Price Data
  price_usd DECIMAL(20, 9) NOT NULL,
  market_cap_usd DECIMAL(20, 2) NOT NULL,
  volume_24h_usd DECIMAL(20, 2) NOT NULL,
  liquidity_usd DECIMAL(20, 2) NOT NULL,
  holders_count INTEGER NOT NULL,
  price_change_24h DECIMAL(10, 4) NOT NULL,
  
  -- Metadata
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. User Token Holdings Table (for portfolio integration)
CREATE TABLE user_token_holdings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_launch_id UUID REFERENCES token_launches(id) ON DELETE SET NULL,
  mint_address VARCHAR(44) NOT NULL,
  
  -- Holdings Data
  balance DECIMAL(20, 9) NOT NULL DEFAULT 0,
  balance_usd DECIMAL(20, 2) NOT NULL DEFAULT 0,
  
  -- Transaction Data
  first_acquired_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user-token combination
  UNIQUE(user_id, mint_address)
);

-- Indexes for performance
CREATE INDEX idx_token_launches_user_id ON token_launches(user_id);
CREATE INDEX idx_token_launches_status ON token_launches(status);
CREATE INDEX idx_token_launches_created_at ON token_launches(created_at DESC);
CREATE INDEX idx_token_launches_mint_address ON token_launches(mint_address) WHERE mint_address IS NOT NULL;
CREATE INDEX idx_token_launches_pool_type ON token_launches(pool_type);
CREATE INDEX idx_token_launches_price_update ON token_launches(last_price_update);

CREATE INDEX idx_token_prices_launch_id ON token_prices(token_launch_id);
CREATE INDEX idx_token_prices_mint_address ON token_prices(mint_address);
CREATE INDEX idx_token_prices_recorded_at ON token_prices(recorded_at DESC);

CREATE INDEX idx_user_holdings_user_id ON user_token_holdings(user_id);
CREATE INDEX idx_user_holdings_mint_address ON user_token_holdings(mint_address);
CREATE INDEX idx_user_holdings_balance_usd ON user_token_holdings(balance_usd DESC);

-- Functions for automatic updates
CREATE OR REPLACE FUNCTION update_token_launch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_token_launches_updated_at
  BEFORE UPDATE ON token_launches
  FOR EACH ROW
  EXECUTE FUNCTION update_token_launch_updated_at();

CREATE TRIGGER trigger_update_user_holdings_updated_at
  BEFORE UPDATE ON user_token_holdings
  FOR EACH ROW
  EXECUTE FUNCTION update_token_launch_updated_at();

-- RLS Policies
ALTER TABLE token_launches ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_token_holdings ENABLE ROW LEVEL SECURITY;

-- Users can only see their own launches
CREATE POLICY "Users can view own token launches" ON token_launches
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own token launches" ON token_launches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own token launches" ON token_launches
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own token launches" ON token_launches
  FOR DELETE USING (auth.uid() = user_id);

-- Users can view prices for their launches
CREATE POLICY "Users can view prices for own launches" ON token_prices
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM token_launches 
      WHERE token_launches.id = token_prices.token_launch_id 
      AND token_launches.user_id = auth.uid()
    )
  );

-- Users can view their own holdings
CREATE POLICY "Users can view own holdings" ON user_token_holdings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own holdings" ON user_token_holdings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own holdings" ON user_token_holdings
  FOR UPDATE USING (auth.uid() = user_id);

-- Service role can do everything (for cron jobs and API)
CREATE POLICY "Service role full access token_launches" ON token_launches
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access token_prices" ON token_prices
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access user_holdings" ON user_token_holdings
  FOR ALL USING (auth.role() = 'service_role');
