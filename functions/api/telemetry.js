import { recordTelemetryEvent } from "../_shared/analytics-repository.js";
import { errorResponse, json, readLimitedJson, requireBindings } from "../_shared/http.js";

export async function onRequestPost({ request, env }) {
  try {
    requireBindings(env, ["DB"]);
    const origin = request.headers.get("origin");
    if (origin && origin !== new URL(request.url).origin) {
      throw Object.assign(new Error("Origem não permitida."), { status: 403 });
    }

    const input = await readLimitedJson(request, 2048);
    await recordTelemetryEvent(env.DB, input);
    return json({ accepted: true }, { status: 202, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
