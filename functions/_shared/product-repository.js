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

const ALLOWED_CATEGORIES = new Set(["cadernetas", "identificacao", "festas", "acabamentos", "outros"]);

function validationError(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function jsonValue(value, label, maxItems = 50) {
  const items = Array.isArray(value) ? value : [];
  if (items.length > maxItems) throw validationError(`${label} permite no máximo ${maxItems} itens.`);
  const serialized = JSON.stringify(items);
  if (serialized.length > 50000) throw validationError(`${label} excede o tamanho permitido.`);
  return serialized;
}

function textValue(value, fallback = "", maxLength = 500, label = "Texto") {
  const text = typeof value === "string" ? value.trim() : fallback;
  if (text.length > maxLength) throw validationError(`${label} permite no máximo ${maxLength} caracteres.`);
  return text;
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
  const name = textValue(input.name, "", 100, "Nome do produto");
  const slug = textValue(input.slug, "", 120, "Identificador")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const price = Number(input.price);
  if (!name) throw validationError("Informe o nome do produto.");
  if (!slug) throw validationError("O produto precisa de um identificador válido.");
  if (!Number.isFinite(price) || price < 0) {
    throw validationError("Informe um preço válido.");
  }

  const category = textValue(input.category, "outros", 40, "Categoria") || "outros";
  if (!ALLOWED_CATEGORIES.has(category)) throw validationError("Escolha uma categoria válida.");

  const imageUrl = textValue(input.image_url, "", 500, "Endereço da imagem");
  const imagePath = textValue(input.image_path, "", 500, "Caminho da imagem");
  if (imageUrl && (!imagePath || imageUrl !== `/media/${imagePath}`)) {
    throw validationError("A foto do produto precisa ter sido enviada pelo painel.");
  }

  return {
    slug,
    category,
    badge: textValue(input.badge, "", 40, "Etiqueta"),
    meta: textValue(input.meta, "", 50, "Tipo do produto"),
    name,
    short_name: textValue(input.short_name, "", 50, "Nome curto"),
    price,
    price_note: textValue(input.price_note, "", 50, "Observação do preço"),
    image_url: imageUrl,
    image_path: imagePath,
    image_alt: textValue(input.image_alt, "", 160, "Descrição da imagem"),
    description: textValue(input.description, "", 500, "Descrição"),
    option_label: textValue(input.option_label, "Opção", 100, "Título das opções") || "Opção",
    options: jsonValue(input.options, "Opções"),
    option_prices: jsonValue(input.option_prices, "Preços das opções"),
    option_descriptions: jsonValue(input.option_descriptions, "Descrições das opções"),
    customization_fields: jsonValue(input.customization_fields, "Campos de personalização", 30),
    customization_notice: textValue(input.customization_notice, "", 500, "Aviso de personalização"),
    details: jsonValue(input.details, "Detalhes"),
    note: textValue(input.note, "", 1000, "Observação final"),
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
  const id = textValue(input.id, "", 120, "Identificador interno") || crypto.randomUUID();
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
