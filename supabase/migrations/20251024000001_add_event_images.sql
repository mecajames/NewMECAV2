-- Add header image URL to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS header_image_url TEXT;

-- Add comment to clarify usage
COMMENT ON COLUMN events.flyer_url IS 'URL to event flyer/poster image';
COMMENT ON COLUMN events.header_image_url IS 'URL to event header/banner image displayed on event cards';
