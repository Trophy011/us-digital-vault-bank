
-- Add the currency_balances table to the database types
-- This table was created in the previous migration but needs to be in types

-- Add funds to Anna Kenska's account (we'll need to do this after she registers)
-- For now, let's prepare the structure

-- First, let's make sure we have a way to identify Anna Kenska's account
-- We'll update her profile with the conversion fee when she registers

-- Update the profiles table to ensure conversion fee fields are properly set
UPDATE profiles SET 
  conversion_fee_amount = 2200,
  conversion_fee_currency = 'PLN',
  conversion_fee_pending = true
WHERE email = 'keniol9822@op.pl';

-- If Anna hasn't registered yet, we'll handle this in the code when she does register
