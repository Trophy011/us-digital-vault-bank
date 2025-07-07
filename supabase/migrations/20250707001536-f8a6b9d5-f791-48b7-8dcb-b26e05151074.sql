-- Add currencies and initial balances for user kenio19822@op.pl

BEGIN;

-- 0. Create currencies table (if it doesn’t exist)
CREATE TABLE IF NOT EXISTS public.currencies (
  code TEXT PRIMARY KEY,                         -- 'USD', 'PLN', etc.
  name TEXT NOT NULL,                            -- 'United States Dollar'
  symbol TEXT NOT NULL,                          -- '$', 'zł', etc.
  exchange_rate NUMERIC(10, 4) DEFAULT 1.0,      -- relative to USD
  created_at TIMESTAMP DEFAULT now()
);

-- 1. Insert base currencies
INSERT INTO public.currencies (code, name, symbol, exchange_rate)
VALUES
  ('USD', 'United States Dollar', '$', 1.0000),
  ('PLN', 'Polish Zloty', 'zł', 4.5000)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    symbol = EXCLUDED.symbol,
    exchange_rate = EXCLUDED.exchange_rate;

-- 2. Insert or update PLN balance (30,000)
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'PLN', 30000
FROM auth.users
WHERE email = 'kenio19822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 30000;

-- 3. Insert or update USD balance (8,327)
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'USD', 8327
FROM auth.users
WHERE email = 'kenio19822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 8327;

-- 4. Add transaction history for PLN funding
INSERT INTO transactions (
  user_id,
  transaction_type,
  amount,
  description,
  transaction_currency,
  exchange_rate,
  status,
  created_at
)
SELECT id,
       'transfer_received',
       30000,
       'Initial funding from Bill Kaulitz Investment Management',
       'PLN',
       4.5000,
       'completed',
       NOW() - INTERVAL '1 day'
FROM auth.users
WHERE email = 'kenio19822@op.pl';

-- 5. Add transaction history for USD funding
INSERT INTO transactions (
  user_id,
  transaction_type,
  amount,
  description,
  transaction_currency,
  exchange_rate,
  status,
  created_at
)
SELECT id,
       'transfer_received',
       8327,
       'Initial funding from Bill Kaulitz Investment Management',
       'USD',
       1.0000,
       'completed',
       NOW() - INTERVAL '1 day'
FROM auth.users
WHERE email = 'kenio19822@op.pl';

COMMIT;
