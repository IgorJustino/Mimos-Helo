import { authenticateAdmin } from "../../../_shared/auth.js";
import { errorResponse, json, requireBindings } from "../../../_shared/http.js";
import { removeProduct } from "../../../_shared/product-repository.js";

export async function onRequestDelete({ request, env, params }) {
  try {
    requireBindings(env, ["DB", "IMAGES"]);
    await authenticateAdmin(request, env);
    const product = await removeProduct(env.DB, String(params.id || ""));
    if (product.image_path) await env.IMAGES.delete(product.image_path).catch(() => {});
    return json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
