import { clearAdminSession } from "../../_lib/auth.js";
import { json } from "../../_lib/http.js";

export async function onRequestPost() {
  return json(
    { signedOut: true },
    { headers: { "Set-Cookie": clearAdminSession(), "Cache-Control": "no-store" } }
  );
}
