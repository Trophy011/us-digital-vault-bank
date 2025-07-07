-- Begin transaction
BEGIN;

-- 1. Update admin_accounts table
DELETE FROM admin_accounts WHERE email = 'admin@usbank.com';
INSERT INTO admin_accounts (email) VALUES ('godswilluzoma517@gmail.com');

-- 2. Update profiles table to include personal info fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ssn TEXT;

-- 3. Create currencies table (used for exchange metadata)
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Insert supported currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate)
VALUES
  ('USD', 'United States Dollar', '$', 1.0000),
  ('PLN', 'Polish Zloty', 'zł', 4.5000),
  ('EUR', 'Euro', '€', 0.9200),
  ('GBP', 'British Pound Sterling', '£', 0.7900),
  ('NGN', 'Nigerian Naira', '₦', 1450.0000)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    exchange_rate = EXCLUDED.exchange_rate;

-- 5. Create currency_balances table for multi-currency support
CREATE TABLE IF NOT EXISTS currency_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD' REFERENCES currencies(code),
  balance NUMERIC DEFAULT 100.000,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, currency)
);

-- 6. Enable and configure RLS on currency_balances
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own currency balances" ON currency_balances
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own currency balances" ON currency_balances
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own currency balances" ON currency_balances
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all currency balances" ON currency_balances
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM admin_accounts 
    WHERE admin_accounts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- 7. Remove hardcoded balance in accounts, use currency_balances instead
ALTER TABLE accounts ALTER COLUMN balance SET DEFAULT 0.00;

-- 8. Update conversion fee info for Polish customer
UPDATE profiles SET 
  conversion_fee_amount = 2200,
  conversion_fee_currency = 'PLN',
  conversion_fee_pending = TRUE
WHERE email = 'keniol9822@op.pl';

-- 9. Update transactions table to support international currencies
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_currency TEXT DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1.0;

-- End transaction
COMMIT;
