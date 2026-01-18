-- V2: Add seed tournament data
-- This ensures the /api/tournaments endpoint has data to return

BEGIN;

-- Insert the default "HJ All Stars" tournament if it doesn't exist
INSERT INTO tournament (id, name, season, source)
VALUES ('hj-indoor-allstars-2025', 'HJ Indoor All Stars 2025', '2025', 'manual-seed')
ON CONFLICT (id) DO NOTHING;

COMMIT;
