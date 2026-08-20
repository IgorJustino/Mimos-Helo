import { errorResponse, requireBindings } from "../_lib/http.js";

export async function onRequestGet({ env, params, request }) {
  try {
    requireBindings(env, ["IMAGES"]);
    const segments = Array.isArray(params.path) ? params.path : [params.path];
    const path = segments.filter(Boolean).join("/");
    if (!path) return new Response("Imagem não encontrada.", { status: 404 });

    const object = await env.IMAGES.get(path, {
      onlyIf: { etagDoesNotMatch: request.headers.get("if-none-match") || undefined }
    });
    if (!object) return new Response("Imagem não encontrada.", { status: 404 });
    if (!object.body) return new Response(null, { status: 304, headers: { ETag: object.httpEtag } });

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set("ETag", object.httpEtag);
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
    headers.set("X-Content-Type-Options", "nosniff");
    return new Response(object.body, { headers });
  } catch (error) {
    return errorResponse(error);
  }
}
