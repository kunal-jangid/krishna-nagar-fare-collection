-- Add phone number to buildings
ALTER TABLE buildings ADD COLUMN IF NOT EXISTS phone_number text;
