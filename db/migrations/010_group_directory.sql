CREATE TABLE IF NOT EXISTS group_directory (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  format TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO group_directory (id, label, format)
VALUES
  ('U11B', 'U11 Boys', 'Round-robin'),
  ('U11G', 'U11 Girls', 'Round-robin'),
  ('U13B', 'U13 Boys', 'Round-robin'),
  ('U13G', 'U13 Girls', 'Round-robin'),
  ('U14B', 'U14 Boys', 'Round-robin'),
  ('U14G', 'U14 Girls', 'Round-robin'),
  ('U16B', 'U16 Boys', 'Round-robin'),
  ('U16G', 'U16 Girls', 'Round-robin'),
  ('U18B', 'U18 Boys', 'Round-robin'),
  ('U18G', 'U18 Girls', 'Round-robin'),
  ('U9M', 'U9 Mixed League', 'Round-robin')
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  format = EXCLUDED.format,
  updated_at = NOW();
