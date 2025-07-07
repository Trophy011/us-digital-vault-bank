-- Add initial balances for user kenio19822@op.pl
BEGIN;

-- Insert or update PLN balance (30,000)
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'PLN', 30000
FROM auth.users
WHERE email = 'kenio19822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 30000;

-- Insert or update USD balance (8,327)
INSERT INTO currency_balances (user_id, currency, balance)
SELECT id, 'USD', 8327
FROM auth.users
WHERE email = 'kenio19822@op.pl'
ON CONFLICT (user_id, currency) DO UPDATE SET balance = 8327;

-- Add transaction history for initial funding from Bill Kaulitz Investment Management
INSERT INTO transactions (user_id, transaction_type, amount, description, transaction_currency, exchange_rate, status)
SELECT id, 'transfer_received', 30000, 'Initial funding from Bill Kaulitz Investment Management', 'PLN', 1.0, 'completed'
FROM auth.users
WHERE email = 'kenio19822@op.pl';

INSERT INTO transactions (user_id, transaction_type, amount, description, transaction_currency, exchange_rate, status)
SELECT id, 'transfer_received', 8327, 'Initial funding from Bill Kaulitz Investment Management', 'USD', 1.0, 'completed'
FROM auth.users
WHERE email = 'kenio19822@op.pl';

COMMIT;
