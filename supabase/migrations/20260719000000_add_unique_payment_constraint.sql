-- Clean up duplicate payment logs, keeping only the latest one
DELETE FROM payment_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (building_id, factor_id, month, year) id
  FROM payment_logs
  ORDER BY building_id, factor_id, month, year, created_at DESC, id
);

-- Add unique constraint to payment_logs table
ALTER TABLE payment_logs
ADD CONSTRAINT unique_building_factor_month_year UNIQUE (building_id, factor_id, month, year);
