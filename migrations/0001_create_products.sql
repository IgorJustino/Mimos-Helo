CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL DEFAULT 'outros',
  badge TEXT NOT NULL DEFAULT '',
  meta TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  short_name TEXT NOT NULL DEFAULT '',
  price REAL NOT NULL DEFAULT 0 CHECK (price >= 0),
  price_note TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  image_path TEXT NOT NULL DEFAULT '',
  image_alt TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  option_label TEXT NOT NULL DEFAULT 'Opção',
  options TEXT NOT NULL DEFAULT '[]',
  option_prices TEXT NOT NULL DEFAULT '[]',
  option_descriptions TEXT NOT NULL DEFAULT '[]',
  customization_fields TEXT NOT NULL DEFAULT '[]',
  customization_notice TEXT NOT NULL DEFAULT '',
  details TEXT NOT NULL DEFAULT '[]',
  note TEXT NOT NULL DEFAULT '',
  published INTEGER NOT NULL DEFAULT 1 CHECK (published IN (0, 1)),
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS products_public_order
  ON products (published, sort_order, created_at);
