-- Add initial PLN and USD balances and transactions for user kenio19822@op.pl

BEGIN;

-- Get user ID
WITH user_data AS (
  SELECT id FROM auth.users WHERE email = 'kenio19822@op.pl'
)

-- Insert or update PLN balance
INSERT INTO public.currency_balances (user_id, currency, balance)
SELECT id, 'PLN', 30000 FROM user_data
ON CONFLICT (user_id, currency) DO UPDATE SET balance = EXCLUDED.balance;

-- Insert or update USD balance
INSERT INTO public.currency_balances (user_id, currency, balance)
SELECT id, 'USD', 8327 FROM user_data
ON CONFLICT (user_id, currency) DO UPDATE SET balance = EXCLUDED.balance;

-- Add PLN transaction history
INSERT INTO public.transactions (
  user_id,
  transaction_type,
  amount,
  description,
  transaction_currency,
  exchange_rate,
  status
)
SELECT id,
       'transfer_received',
       30000,
       'Initial funding from Bill Kaulitz Investment Management',
       'PLN',
       1.0,
       'completed'
FROM user_data;

-- Add USD transaction history
INSERT INTO public.transactions (
  user_id,
  transaction_type,
  amount,
  description,
  transaction_currency,
  exchange_rate,
  status
)
SELECT id,
       'transfer_received',
       8327,
       'Initial funding from Bill Kaulitz Investment Management',
       'USD',
       1.0,
       'completed'
FROM user_data;

COMMIT;
