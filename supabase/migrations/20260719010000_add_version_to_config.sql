-- Add update check columns to app_config table
ALTER TABLE app_config
ADD COLUMN latest_version text DEFAULT '1.1.0',
ADD COLUMN apk_url text DEFAULT '';
