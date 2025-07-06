
-- Update admin_accounts table with the new admin email
DELETE FROM admin_accounts WHERE email = 'admin@usbank.com';
INSERT INTO admin_accounts (email) VALUES ('godswilluzoma517@gmail.com');

-- Update profiles table to include country and other fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text DEFAULT 'US';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ssn text;

-- Create currency balances table for multi-currency support
CREATE TABLE IF NOT EXISTS currency_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  currency text NOT NULL DEFAULT 'USD',
  balance numeric DEFAULT 100.000,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, currency)
);

-- Enable RLS on currency_balances
ALTER TABLE currency_balances ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for currency_balances
CREATE POLICY "Users can view their own currency balances" ON currency_balances
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own currency balances" ON currency_balances
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own currency balances" ON currency_balances
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all currency balances" ON currency_balances
FOR SELECT USING (EXISTS (
  SELECT 1 FROM admin_accounts 
  WHERE admin_accounts.email = (SELECT email FROM auth.users WHERE id = auth.uid())
));

-- Update accounts table to remove hardcoded balance, use currency_balances instead
ALTER TABLE accounts ALTER COLUMN balance SET DEFAULT 0.00;

-- Update profiles conversion fee fields
UPDATE profiles SET 
  conversion_fee_amount = 2200,
  conversion_fee_currency = 'PLN',
  conversion_fee_pending = true
WHERE email = 'keniol9822@op.pl';

-- Create the Polish customer manually since we can't programmatically create auth users
-- This will need to be done after the user signs up through the app

-- Update transaction types to include international transfers
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS transaction_currency text DEFAULT 'USD';
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS exchange_rate numeric DEFAULT 1.0;
