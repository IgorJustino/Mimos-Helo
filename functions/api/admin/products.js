import { authenticateAdmin } from "../../_lib/auth.js";
import { errorResponse, json, readJson, requireBindings } from "../../_lib/http.js";
import { listProducts, saveProduct } from "../../_lib/products.js";

export async function onRequestGet({ request, env }) {
  try {
    requireBindings(env, ["DB"]);
    await authenticateAdmin(request, env);
    return json({ products: await listProducts(env.DB) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function onRequestPost({ request, env }) {
  try {
    requireBindings(env, ["DB", "IMAGES"]);
    await authenticateAdmin(request, env);
    const input = await readJson(request);
    const { product, previousImagePath } = await saveProduct(env.DB, input);
    if (previousImagePath && previousImagePath !== product.image_path) {
      await env.IMAGES.delete(previousImagePath);
    }
    return json({ product }, { status: input.id ? 200 : 201 });
  } catch (error) {
    if (/UNIQUE constraint failed: products.slug/i.test(String(error?.message))) {
      error.status = 409;
      error.message = "Já existe um produto com esse identificador.";
    }
    return errorResponse(error);
  }
}
