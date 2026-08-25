import { authenticateAdmin } from "../../../_shared/auth.js";
import { errorResponse, json, requireBindings } from "../../../_shared/http.js";
import { deleteImageQuietly } from "../../../_shared/image-storage.js";
import { removeProduct } from "../../../_shared/product-repository.js";

export async function onRequestDelete({ request, env, params }) {
  try {
    requireBindings(env, ["DB", "IMAGES"]);
    await authenticateAdmin(request, env);
    const product = await removeProduct(env.DB, String(params.id || ""));
    await deleteImageQuietly(env.IMAGES, product.image_path);
    return json({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
