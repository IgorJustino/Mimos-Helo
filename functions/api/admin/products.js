import { authenticateAdmin } from "../../_shared/auth.js";
import { errorResponse, json, readJson, requireBindings } from "../../_shared/http.js";
import { deleteImageQuietly, promotePendingImage } from "../../_shared/image-storage.js";
import { listProducts, saveProduct } from "../../_shared/product-repository.js";

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
  let promotedImage = null;
  let productSaved = false;

  try {
    requireBindings(env, ["DB", "IMAGES"]);
    await authenticateAdmin(request, env);
    const input = await readJson(request);
    promotedImage = await promotePendingImage(env.IMAGES, input.image_path);
    if (promotedImage) {
      input.image_path = promotedImage.permanentPath;
      input.image_url = promotedImage.publicUrl;
    }

    const { product, previousImagePath } = await saveProduct(env.DB, input);
    productSaved = true;

    if (promotedImage) await deleteImageQuietly(env.IMAGES, promotedImage.pendingPath);
    if (previousImagePath && previousImagePath !== product.image_path) {
      await deleteImageQuietly(env.IMAGES, previousImagePath);
    }
    return json({ product }, { status: input.id ? 200 : 201 });
  } catch (error) {
    if (promotedImage && !productSaved) await deleteImageQuietly(env.IMAGES, promotedImage.permanentPath);
    if (/UNIQUE constraint failed: products.slug/i.test(String(error?.message))) {
      error.status = 409;
      error.message = "Já existe um produto com esse identificador.";
    }
    return errorResponse(error);
  }
}
