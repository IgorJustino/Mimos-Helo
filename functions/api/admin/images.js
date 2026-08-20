import { authenticateAdmin } from "../../_lib/auth.js";
import { errorResponse, json, requireBindings } from "../../_lib/http.js";

const TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"]
]);
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

export async function onRequestPost({ request, env }) {
  try {
    requireBindings(env, ["DB", "IMAGES"]);
    await authenticateAdmin(request, env);
    const formData = await request.formData();
    const file = formData.get("image");
    if (!file || typeof file === "string") {
      throw Object.assign(new Error("Escolha uma imagem para enviar."), { status: 400 });
    }
    const extension = TYPES.get(file.type);
    if (!extension) throw Object.assign(new Error("Use uma imagem JPG, PNG ou WebP."), { status: 415 });
    if (file.size > MAX_IMAGE_SIZE) {
      throw Object.assign(new Error("A imagem deve ter no máximo 5 MB."), { status: 413 });
    }

    const path = `catalogo/${Date.now()}-${crypto.randomUUID()}.${extension}`;
    await env.IMAGES.put(path, file.stream(), {
      httpMetadata: { contentType: file.type, cacheControl: "public, max-age=31536000, immutable" },
      customMetadata: { originalName: String(file.name || "produto") }
    });
    return json({ path, publicUrl: `/media/${path}` }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
