(function createCatalogApi(global) {
  "use strict";

  let configPromise;

  function asArray(value) {
    return Array.isArray(value) ? value : [];
  }

  async function requestJson(path, options = {}) {
    const response = await fetch(path, {
      ...options,
      credentials: "same-origin",
      headers: {
        Accept: "application/json",
        ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
        ...(options.headers || {})
      }
    });

    let payload = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      const error = new Error(payload?.error || "Não foi possível conectar ao catálogo.");
      error.status = response.status;
      throw error;
    }

    return payload;
  }

  async function loadConfiguration() {
    if (configPromise) return configPromise;
    configPromise = requestJson("/api/health", { cache: "no-store" })
      .then((result) => ({
        configured: Boolean(result?.configured),
        database: result?.database || "cloudflare-d1",
        storage: result?.storage || "cloudflare-r2",
        source: "cloudflare"
      }))
      .catch(() => ({ configured: false, source: "none" }));
    return configPromise;
  }

  function normalizeProduct(row) {
    const price = Number(row.price || 0);
    return {
      id: row.id,
      slug: row.slug,
      category: row.category || "outros",
      badge: row.badge || "",
      meta: row.meta || "Produto personalizado",
      name: row.name,
      shortName: row.short_name || "",
      price,
      priceLabel: new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL",
        maximumFractionDigits: price % 1 === 0 ? 0 : 2
      }).format(price),
      priceNote: row.price_note || "",
      image: row.image_url || "",
      imagePath: row.image_path || "",
      alt: row.image_alt || `Foto de ${row.name}`,
      description: row.description || "",
      optionLabel: row.option_label || "Opção",
      options: asArray(row.options),
      optionPrices: asArray(row.option_prices),
      optionDescriptions: asArray(row.option_descriptions),
      customizationFields: asArray(row.customization_fields),
      customizationNotice: row.customization_notice || "",
      details: asArray(row.details),
      note: row.note || "",
      published: row.published !== false,
      sortOrder: Number(row.sort_order || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  function serializeProduct(product) {
    const row = {
      slug: product.slug,
      category: product.category,
      badge: product.badge || "",
      meta: product.meta || "",
      name: product.name,
      short_name: product.shortName || "",
      price: Number(product.price || 0),
      price_note: product.priceNote || "",
      image_url: product.image || "",
      image_path: product.imagePath || "",
      image_alt: product.alt || "",
      description: product.description || "",
      option_label: product.optionLabel || "Opção",
      options: asArray(product.options),
      option_prices: asArray(product.optionPrices),
      option_descriptions: asArray(product.optionDescriptions),
      customization_fields: asArray(product.customizationFields),
      customization_notice: product.customizationNotice || "",
      details: asArray(product.details),
      note: product.note || "",
      published: product.published !== false,
      sort_order: Number(product.sortOrder || 0)
    };
    if (product.id) row.id = product.id;
    return row;
  }

  async function listPublishedProducts() {
    const config = await loadConfiguration();
    if (!config.configured) return { configured: false, products: [] };
    const result = await requestJson("/api/products");
    return { configured: true, products: (result?.products || []).map(normalizeProduct) };
  }

  async function listAllProducts() {
    const result = await requestJson("/api/admin/products", { cache: "no-store" });
    return (result?.products || []).map(normalizeProduct);
  }

  async function getCurrentUser() {
    try {
      const result = await requestJson("/api/admin/me", { cache: "no-store" });
      return result?.user || null;
    } catch (error) {
      if (error.status === 401 || error.status === 403) return null;
      throw error;
    }
  }

  async function verifyAdmin(userId) {
    return Boolean(userId);
  }

  async function signIn(username, password) {
    return requestJson("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ username, password })
    });
  }

  async function signOut() {
    await requestJson("/api/admin/logout", { method: "POST", body: JSON.stringify({}) });
  }

  async function saveProduct(product) {
    const result = await requestJson("/api/admin/products", {
      method: "POST",
      body: JSON.stringify(serializeProduct(product))
    });
    return normalizeProduct(result.product);
  }

  async function deleteProduct(productId) {
    await requestJson(`/api/admin/products/${encodeURIComponent(productId)}`, { method: "DELETE" });
  }

  async function uploadProductImage(file) {
    const body = new FormData();
    body.append("image", file);
    return requestJson("/api/admin/images", { method: "POST", body });
  }

  global.MimosCatalog = {
    loadConfiguration,
    listPublishedProducts,
    listAllProducts,
    signIn,
    signOut,
    getCurrentUser,
    verifyAdmin,
    saveProduct,
    deleteProduct,
    uploadProductImage,
    normalizeProduct
  };
})(window);
