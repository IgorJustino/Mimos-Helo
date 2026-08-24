import { createAdminSession, verifyCredentials } from "../../_shared/auth.js";
import { errorResponse, json, readJson, requireBindings } from "../../_shared/http.js";

const WINDOW_SECONDS = 15 * 60;
const MAX_ATTEMPTS = 8;

async function getAttempts(db, ip) {
  return db.prepare("SELECT attempts, window_started FROM admin_login_attempts WHERE ip = ?1").bind(ip).first();
}

async function registerFailure(db, ip, now, current) {
  const activeWindow = current && now - Number(current.window_started) < WINDOW_SECONDS;
  const attempts = activeWindow ? Number(current.attempts) + 1 : 1;
  const windowStarted = activeWindow ? Number(current.window_started) : now;
  await db
    .prepare(
      `INSERT INTO admin_login_attempts (ip, attempts, window_started)
       VALUES (?1, ?2, ?3)
       ON CONFLICT(ip) DO UPDATE SET attempts = excluded.attempts, window_started = excluded.window_started`
    )
    .bind(ip, attempts, windowStarted)
    .run();
}

export async function onRequestPost({ request, env }) {
  try {
    requireBindings(env, ["DB"]);
    const ip = request.headers.get("cf-connecting-ip") || "unknown";
    const now = Math.floor(Date.now() / 1000);
    const attempts = await getAttempts(env.DB, ip);
    if (attempts && now - Number(attempts.window_started) < WINDOW_SECONDS && Number(attempts.attempts) >= MAX_ATTEMPTS) {
      throw Object.assign(new Error("Muitas tentativas. Aguarde 15 minutos e tente novamente."), { status: 429 });
    }

    const input = await readJson(request);
    const username = String(input.username || "").trim();
    if (!(await verifyCredentials(username, input.password, env))) {
      await registerFailure(env.DB, ip, now, attempts);
      throw Object.assign(new Error("Usuário ou senha incorretos."), { status: 401 });
    }

    await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip = ?1").bind(ip).run();
    return json(
      { user: { id: username, username, email: "" } },
      { headers: { "Set-Cookie": await createAdminSession(username, env), "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
