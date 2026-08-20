import { json } from "../_lib/http.js";

export async function onRequestGet({ env }) {
  if (!env.DB || !env.IMAGES) {
    return json(
      { configured: false, database: Boolean(env.DB), storage: Boolean(env.IMAGES), provider: "cloudflare" },
      { status: 503 }
    );
  }

  try {
    await env.DB.prepare("SELECT COUNT(*) AS total FROM products").first();
    return json({ configured: true, database: "cloudflare-d1", storage: "cloudflare-r2", provider: "cloudflare" });
  } catch {
    return json(
      { configured: false, database: false, storage: Boolean(env.IMAGES), provider: "cloudflare" },
      { status: 503 }
    );
  }
}
