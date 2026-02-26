ALTER TABLE venue
  ADD COLUMN IF NOT EXISTS website_url TEXT;

ALTER TABLE venue_directory
  ADD COLUMN IF NOT EXISTS website_url TEXT;
