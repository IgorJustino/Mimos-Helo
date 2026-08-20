import { authenticateAdmin } from "../../_lib/auth.js";
import { errorResponse, json } from "../../_lib/http.js";

export async function onRequestGet({ request, env }) {
  try {
    return json({ user: await authenticateAdmin(request, env) });
  } catch (error) {
    return errorResponse(error);
  }
}
