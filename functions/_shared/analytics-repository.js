export const ANALYTICS_EVENTS = Object.freeze([
  "catalog_view",
  "product_view",
  "cart_add",
  "whatsapp_click"
]);

const EVENT_SET = new Set(ANALYTICS_EVENTS);
const MAX_PRODUCT_SLUGS = 20;

function telemetryError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function normalizeEventName(value) {
  const eventName = typeof value === "string" ? value.trim() : "";
  if (!EVENT_SET.has(eventName)) throw telemetryError("Evento de telemetria inválido.");
  return eventName;
}

function normalizeProductSlugs(value) {
  const source = Array.isArray(value) ? value : value ? [value] : [];
  const slugs = [...new Set(source.map((item) => String(item || "").trim()).filter(Boolean))];
  if (slugs.length > MAX_PRODUCT_SLUGS) throw telemetryError("O evento possui produtos demais.");
  if (slugs.some((slug) => slug.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug))) {
    throw telemetryError("O evento possui um produto inválido.");
  }
  return slugs;
}

async function validatePublishedSlugs(db, slugs) {
  if (!slugs.length) return [];
  const placeholders = slugs.map((_, index) => `?${index + 1}`).join(", ");
  const result = await db
    .prepare(`SELECT slug FROM products WHERE published = 1 AND slug IN (${placeholders})`)
    .bind(...slugs)
    .all();
  const published = new Set((result.results || []).map((row) => row.slug));
  if (published.size !== slugs.length) throw telemetryError("O evento referencia um produto indisponível.");
  return slugs;
}

export async function recordTelemetryEvent(db, input, now = new Date()) {
  const eventName = normalizeEventName(input?.eventName);
  const requestedSlugs = normalizeProductSlugs(input?.productSlugs || input?.productSlug);

  if ((eventName === "product_view" || eventName === "cart_add") && requestedSlugs.length !== 1) {
    throw telemetryError("Este evento precisa identificar um produto.");
  }

  const productSlugs = await validatePublishedSlugs(db, requestedSlugs);
  const eventDate = now.toISOString().slice(0, 10);
  const statement = `INSERT INTO analytics_daily_events (event_date, event_name, product_slug, count)
    VALUES (?1, ?2, ?3, 1)
    ON CONFLICT(event_date, event_name, product_slug)
    DO UPDATE SET count = count + 1`;
  const keys = ["", ...productSlugs];

  await db.batch(keys.map((slug) => db.prepare(statement).bind(eventDate, eventName, slug)));
  return { eventDate, eventName, productSlugs };
}

export async function getAnalyticsSummary(db, periodDays = 30, now = new Date()) {
  const days = Math.min(90, Math.max(1, Number(periodDays) || 30));
  const periodStart = new Date(now);
  periodStart.setUTCDate(periodStart.getUTCDate() - (days - 1));
  const startDate = periodStart.toISOString().slice(0, 10);

  const [totalsResult, productsResult] = await Promise.all([
    db
      .prepare(
        `SELECT event_name, SUM(count) AS total
         FROM analytics_daily_events
         WHERE event_date >= ?1 AND product_slug = ''
         GROUP BY event_name`
      )
      .bind(startDate)
      .all(),
    db
      .prepare(
        `SELECT
           events.product_slug,
           COALESCE(products.name, events.product_slug) AS product_name,
           SUM(CASE WHEN events.event_name = 'product_view' THEN events.count ELSE 0 END) AS product_views,
           SUM(CASE WHEN events.event_name = 'cart_add' THEN events.count ELSE 0 END) AS cart_adds,
           SUM(CASE WHEN events.event_name = 'whatsapp_click' THEN events.count ELSE 0 END) AS whatsapp_clicks
         FROM analytics_daily_events AS events
         LEFT JOIN products ON products.slug = events.product_slug
         WHERE events.event_date >= ?1 AND events.product_slug <> ''
         GROUP BY events.product_slug, products.name
         ORDER BY whatsapp_clicks DESC, cart_adds DESC, product_views DESC
         LIMIT 5`
      )
      .bind(startDate)
      .all()
  ]);

  const totals = Object.fromEntries(ANALYTICS_EVENTS.map((eventName) => [eventName, 0]));
  for (const row of totalsResult.results || []) totals[row.event_name] = Number(row.total || 0);

  return {
    periodDays: days,
    startDate,
    endDate: now.toISOString().slice(0, 10),
    totals,
    products: (productsResult.results || []).map((row) => ({
      slug: row.product_slug,
      name: row.product_name,
      productViews: Number(row.product_views || 0),
      cartAdds: Number(row.cart_adds || 0),
      whatsappClicks: Number(row.whatsapp_clicks || 0)
    }))
  };
}
