CREATE TABLE IF NOT EXISTS analytics_daily_events (
  event_date TEXT NOT NULL,
  event_name TEXT NOT NULL CHECK (
    event_name IN ('catalog_view', 'product_view', 'cart_add', 'whatsapp_click')
  ),
  product_slug TEXT NOT NULL DEFAULT '',
  count INTEGER NOT NULL DEFAULT 0 CHECK (count >= 0),
  PRIMARY KEY (event_date, event_name, product_slug)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS analytics_event_period
  ON analytics_daily_events (event_name, event_date, product_slug);
