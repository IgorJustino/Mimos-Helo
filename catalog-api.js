(function createCatalogApi(global) {
  "use strict";

  const SDK_URL = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js";
  const PRODUCT_COLUMNS = [
    "id",
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
    "sort_order",
    "created_at",
    "updated_at"
  ].join(",");

  let sdkPromise;
  let configPromise;
  let clientPromise;

  function hasLocalConfiguration(config) {
    return Boolean(config?.supabaseUrl && config?.supabasePublishableKey);
  }

  async function loadConfiguration() {
    if (configPromise) return configPromise;

    configPromise = (async () => {
      const localConfig = global.MIMOS_HELO_CONFIG;
      if (hasLocalConfiguration(localConfig)) {
        return { ...localConfig, configured: true, source: "local" };
      }

      try {
        const response = await fetch("/api/catalog-config", {
          headers: { Accept: "application/json" },
          cache: "no-store"
        });
        if (!response.ok) return { configured: false, source: "none" };
        const remoteConfig = await response.json();
        return {
          ...remoteConfig,
          configured: hasLocalConfiguration(remoteConfig),
          source: "vercel"
        };
      } catch {
        return { configured: false, source: "none" };
      }
    })();

    return configPromise;
  }

  function loadSdk() {
    if (global.supabase?.createClient) return Promise.resolve(global.supabase);
    if (sdkPromise) return sdkPromise;

    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SDK_URL;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve(global.supabase);
      script.onerror = () => reject(new Error("Não foi possível carregar a conexão segura com o catálogo."));
      document.head.append(script);
    });

    return sdkPromise;
  }

  async function getClient() {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      const config = await loadConfiguration();
      if (!config.configured) return null;
      const sdk = await loadSdk();
      return sdk.createClient(config.supabaseUrl, config.supabasePublishableKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    })();

    return clientPromise;
  }

  function asArray(value) {
    return Array.isArray(value) ? value : [];
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
      image: row.image_url || "assets/images/reforma-luxo.jpeg",
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
    const client = await getClient();
    if (!client) return { configured: false, products: [] };
    const { data, error } = await client
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("published", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return { configured: true, products: (data || []).map(normalizeProduct) };
  }

  async function listAllProducts() {
    const client = await getClient();
    if (!client) throw new Error("O catálogo ainda não foi conectado ao Supabase.");
    const { data, error } = await client
      .from("products")
      .select(PRODUCT_COLUMNS)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data || []).map(normalizeProduct);
  }

  async function signIn(email, password) {
    const client = await getClient();
    if (!client) throw new Error("O catálogo ainda não foi conectado ao Supabase.");
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data;
  }

  async function signOut() {
    const client = await getClient();
    if (client) await client.auth.signOut();
  }

  async function getCurrentUser() {
    const client = await getClient();
    if (!client) return null;
    const { data, error } = await client.auth.getUser();
    if (error) return null;
    return data.user;
  }

  async function verifyAdmin(userId) {
    const client = await getClient();
    if (!client || !userId) return false;
    const { data, error } = await client
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return Boolean(data);
  }

  async function saveProduct(product) {
    const client = await getClient();
    if (!client) throw new Error("O catálogo ainda não foi conectado ao Supabase.");
    const { data, error } = await client
      .from("products")
      .upsert(serializeProduct(product))
      .select(PRODUCT_COLUMNS)
      .single();
    if (error) throw error;
    return normalizeProduct(data);
  }

  async function deleteProduct(productId) {
    const client = await getClient();
    if (!client) throw new Error("O catálogo ainda não foi conectado ao Supabase.");
    const { error } = await client.from("products").delete().eq("id", productId);
    if (error) throw error;
  }

  async function uploadProductImage(file) {
    const client = await getClient();
    if (!client) throw new Error("O catálogo ainda não foi conectado ao Supabase.");
    const extension = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `catalogo/${Date.now()}-${crypto.randomUUID()}.${extension || "jpg"}`;
    const { error } = await client.storage.from("product-images").upload(path, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false
    });
    if (error) throw error;
    const { data } = client.storage.from("product-images").getPublicUrl(path);
    return { path, publicUrl: data.publicUrl };
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
