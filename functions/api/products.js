import { errorResponse, json, requireBindings } from "../_shared/http.js";
import { listProducts } from "../_shared/product-repository.js";

export async function onRequestGet({ env }) {
  try {
    requireBindings(env, ["DB"]);
    const products = await listProducts(env.DB, true);
    return json({ products }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
