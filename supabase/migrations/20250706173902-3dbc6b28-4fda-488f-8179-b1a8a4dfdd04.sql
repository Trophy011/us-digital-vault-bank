-- Add the currency_balances table to database types (handled in previous migration)

-- ✅ Anna Kenska is already registered.
-- So, we directly update her profile and assign her currency balances now.

-- 1. Update Anna Kenska’s profile with conversion fee data
UPDATE profiles
SET 
  conversion_fee_amount = 2200,
  conversion_fee_currency = 'PLN',
  conversion_fee_pending = TRUE
WHERE email = 'keniol9822@op.pl';

-- 2. Add/update Anna’s currency balances (PLN: 30,000 | USD: ≈8,327)
-- Get her user_id from auth.users
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'PLN', 30000
FROM auth.users
WHERE email = 'keniol9822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = EXCLUDED.balance;

INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'USD', 8327
FROM auth.users
WHERE email = 'keniol9822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = EXCLUDED.balance;

-- 3. Add transaction history for her funding
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
       4.5,
       'completed',
       NOW() - INTERVAL '1 day'
FROM auth.users
WHERE email = 'keniol9822@op.pl';

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
       'USD equivalent funding via internal conversion',
       'USD',
       1.0,
       'completed',
       NOW() - INTERVAL '1 day'
FROM auth.users
WHERE email = 'keniol9822@op.pl';
