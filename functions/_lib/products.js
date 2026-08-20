const JSON_COLUMNS = [
  "options",
  "option_prices",
  "option_descriptions",
  "customization_fields",
  "details"
];

const EDITABLE_COLUMNS = [
  "slug",
  "category",
  "badge",
  "meta",
  "name",
  "short_name",
  "price",
  "price_note",
  "image_url",
  "image_path",
  "image_alt",
  "description",
  "option_label",
  "options",
  "option_prices",
  "option_descriptions",
  "customization_fields",
  "customization_notice",
  "details",
  "note",
  "published",
  "sort_order"
];

function arrayValue(value) {
  return Array.isArray(value) ? value : [];
}

function textValue(value, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

export function decodeProduct(row) {
  if (!row) return null;
  const product = { ...row, published: Boolean(row.published), price: Number(row.price || 0) };
  for (const column of JSON_COLUMNS) {
    try {
      product[column] = Array.isArray(row[column]) ? row[column] : JSON.parse(row[column] || "[]");
    } catch {
      product[column] = [];
    }
  }
  return product;
}

export function prepareProduct(input) {
  const name = textValue(input.name);
  const slug = textValue(input.slug)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const price = Number(input.price);
  if (!name) throw Object.assign(new Error("Informe o nome do produto."), { status: 400 });
  if (!slug) throw Object.assign(new Error("O produto precisa de um identificador válido."), { status: 400 });
  if (!Number.isFinite(price) || price < 0) {
    throw Object.assign(new Error("Informe um preço válido."), { status: 400 });
  }

  return {
    slug,
    category: textValue(input.category, "outros") || "outros",
    badge: textValue(input.badge),
    meta: textValue(input.meta),
    name,
    short_name: textValue(input.short_name),
    price,
    price_note: textValue(input.price_note),
    image_url: textValue(input.image_url),
    image_path: textValue(input.image_path),
    image_alt: textValue(input.image_alt),
    description: textValue(input.description),
    option_label: textValue(input.option_label, "Opção") || "Opção",
    options: JSON.stringify(arrayValue(input.options)),
    option_prices: JSON.stringify(arrayValue(input.option_prices)),
    option_descriptions: JSON.stringify(arrayValue(input.option_descriptions)),
    customization_fields: JSON.stringify(arrayValue(input.customization_fields)),
    customization_notice: textValue(input.customization_notice),
    details: JSON.stringify(arrayValue(input.details)),
    note: textValue(input.note),
    published: input.published === false ? 0 : 1,
    sort_order: Number.isFinite(Number(input.sort_order)) ? Number(input.sort_order) : 0
  };
}

export async function listProducts(db, publishedOnly = false) {
  const where = publishedOnly ? "WHERE published = 1" : "";
  const result = await db
    .prepare(`SELECT * FROM products ${where} ORDER BY sort_order ASC, created_at ASC`)
    .all();
  return (result.results || []).map(decodeProduct);
}

export async function findProduct(db, id) {
  const row = await db.prepare("SELECT * FROM products WHERE id = ?1").bind(id).first();
  return decodeProduct(row);
}

export async function saveProduct(db, input) {
  const row = prepareProduct(input);
  const id = textValue(input.id) || crypto.randomUUID();
  const existing = await findProduct(db, id);
  const createdAt = existing?.created_at || new Date().toISOString();
  const updatedAt = new Date().toISOString();
  const columns = ["id", ...EDITABLE_COLUMNS, "created_at", "updated_at"];
  const placeholders = columns.map((_, index) => `?${index + 1}`).join(", ");
  const updates = EDITABLE_COLUMNS.map((column) => `${column} = excluded.${column}`).join(", ");
  const values = [id, ...EDITABLE_COLUMNS.map((column) => row[column]), createdAt, updatedAt];

  await db
    .prepare(
      `INSERT INTO products (${columns.join(", ")}) VALUES (${placeholders})
       ON CONFLICT(id) DO UPDATE SET ${updates}, updated_at = excluded.updated_at`
    )
    .bind(...values)
    .run();

  return { product: await findProduct(db, id), previousImagePath: existing?.image_path || "" };
}

export async function removeProduct(db, id) {
  const existing = await findProduct(db, id);
  if (!existing) throw Object.assign(new Error("Produto não encontrado."), { status: 404 });
  await db.prepare("DELETE FROM products WHERE id = ?1").bind(id).run();
  return existing;
}
