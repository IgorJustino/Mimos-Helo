import { errorResponse, json, requireBindings } from "../_lib/http.js";
import { listProducts } from "../_lib/products.js";

export async function onRequestGet({ env }) {
  try {
    requireBindings(env, ["DB"]);
    const products = await listProducts(env.DB, true);
    return json({ products }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
  } catch (error) {
    return errorResponse(error);
  }
}
