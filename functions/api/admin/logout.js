import { clearAdminSession } from "../../_shared/auth.js";
import { json } from "../../_shared/http.js";

export async function onRequestPost() {
  return json(
    { signedOut: true },
    { headers: { "Set-Cookie": clearAdminSession(), "Cache-Control": "no-store" } }
  );
}
