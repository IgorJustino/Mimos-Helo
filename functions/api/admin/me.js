import { authenticateAdmin } from "../../_shared/auth.js";
import { errorResponse, json } from "../../_shared/http.js";

export async function onRequestGet({ request, env }) {
  try {
    return json({ user: await authenticateAdmin(request, env) });
  } catch (error) {
    return errorResponse(error);
  }
}
