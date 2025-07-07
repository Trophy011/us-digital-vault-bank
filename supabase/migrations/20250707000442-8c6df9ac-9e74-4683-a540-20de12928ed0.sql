-- Begin transaction
BEGIN;

-- 1. Add missing columns to transactions
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS transaction_currency TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;

-- 2. Add missing columns to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ssn TEXT;

-- 3. Create currencies table (holds valid codes, symbols, and exchange rates)
CREATE TABLE IF NOT EXISTS currencies (
  code TEXT PRIMARY KEY,                           -- e.g. 'USD'
  name TEXT NOT NULL,                              -- e.g. 'US Dollar'
  symbol TEXT NOT NULL,                            -- e.g. '$'
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0,        -- relative to USD
  created_at TIMESTAMP DEFAULT now()
);

-- 4. Insert standard supported currencies
INSERT INTO currencies (code, name, symbol, exchange_rate)
VALUES
  ('USD', 'United States Dollar', '$', 1.0000),
  ('PLN', 'Polish Zloty', 'zł', 4.5000),
  ('EUR', 'Euro', '€', 0.9200),
  ('GBP', 'British Pound', '£', 0.7900),
  ('NGN', 'Nigerian Naira', '₦', 1450.0000)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  exchange_rate = EXCLUDED.exchange_rate;

-- 5. Create currency_balances table
CREATE TABLE IF NOT EXISTS currency_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL REFERENCES currencies(code),  -- FK to currencies table
  balance NUMERIC DEFAULT 100.000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- 6. Enable Row-Level Security
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
-- Allow users to see, insert, and update only their own balances
CREATE POLICY "Users can view their own currency balances" ON currency_balances
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own currency balances" ON currency_balances
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own currency balances" ON currency_balances
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow admins to view all balances
CREATE POLICY "Admins can view all currency balances" ON currency_balances
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_accounts
    WHERE admin_accounts.email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  )
);

-- End transaction
COMMIT;
