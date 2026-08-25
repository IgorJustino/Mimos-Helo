import { getAnalyticsSummary } from "../../_shared/analytics-repository.js";
import { authenticateAdmin } from "../../_shared/auth.js";
import { errorResponse, json, requireBindings } from "../../_shared/http.js";

export async function onRequestGet({ request, env }) {
  try {
    requireBindings(env, ["DB"]);
    await authenticateAdmin(request, env);
    const days = new URL(request.url).searchParams.get("days") || 30;
    return json(await getAnalyticsSummary(env.DB, days), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return errorResponse(error);
  }
}
