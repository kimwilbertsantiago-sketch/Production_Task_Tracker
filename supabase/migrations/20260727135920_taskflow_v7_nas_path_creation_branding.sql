-- Add new 'creation_branding' value to the episode_status enum
ALTER TYPE episode_status ADD VALUE IF NOT EXISTS 'creation_branding';

-- Add NAS path column to clients
ALTER TABLE clients ADD COLUMN IF NOT EXISTS nas_path text;

-- Copy data from asset_drive_path into nas_path (preserve existing data)
UPDATE clients SET nas_path = asset_drive_path WHERE nas_path IS NULL AND asset_drive_path IS NOT NULL;

-- Drop the old asset path columns
ALTER TABLE clients DROP COLUMN IF EXISTS asset_drive_path;
ALTER TABLE clients DROP COLUMN IF EXISTS template_path;