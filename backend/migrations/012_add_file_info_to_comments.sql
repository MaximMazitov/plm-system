-- Add file info columns to comments table
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_name VARCHAR(500);
ALTER TABLE comments ADD COLUMN IF NOT EXISTS file_type VARCHAR(50);

-- Rename image_url to file_url for clarity (keeping image_url as alias)
-- We'll keep image_url for backwards compatibility
