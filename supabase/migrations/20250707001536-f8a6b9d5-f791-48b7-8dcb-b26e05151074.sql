
-- Add initial balances for Anna Kenska (keniol9822@op.pl)
-- First, let's get her user ID and add the balances
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'PLN', 30000
FROM auth.users 
WHERE email = 'keniol9822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 30000;

INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'USD', 8327
FROM auth.users 
WHERE email = 'keniol9822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 8327;

-- Add transaction history showing the money came from Bill Kaulitz Investment Management
INSERT INTO transactions (user_id, transaction_type, amount, description, transaction_currency, exchange_rate, status)
SELECT id, 'transfer_received', 30000, 'Initial funding from Bill Kaulitz Investment Management', 'PLN', 1.0, 'completed'
FROM auth.users 
WHERE email = 'keniol9822@op.pl';

INSERT INTO transactions (user_id, transaction_type, amount, description, transaction_currency, exchange_rate, status)
SELECT id, 'transfer_received', 8327, 'Initial funding from Bill Kaulitz Investment Management', 'USD', 1.0, 'completed'
FROM auth.users 
WHERE email = 'keniol9822@op.pl';
