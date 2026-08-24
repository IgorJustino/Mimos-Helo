const COOKIE_NAME = "mimos_helo_admin";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

export class AuthError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

function bytesToBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  try {
    const binary = atob(padded);
    return Uint8Array.from(binary, (character) => character.charCodeAt(0));
  } catch {
    throw new AuthError("Sessão administrativa inválida.", 401);
  }
}

function readCookie(request, name) {
  const cookies = request.headers.get("cookie") || "";
  for (const entry of cookies.split(";")) {
    const [cookieName, ...parts] = entry.trim().split("=");
    if (cookieName === name) return parts.join("=");
  }
  return "";
}

async function loadAuthConfiguration(env) {
  if (!env.DB) throw new AuthError("O banco administrativo ainda não foi configurado.", 503);
  const row = await env.DB
    .prepare("SELECT username, password_hash, session_secret FROM admin_credentials WHERE id = 1")
    .first();
  const username = String(row?.username || "").trim();
  const passwordHash = String(row?.password_hash || "");
  const sessionSecret = String(row?.session_secret || "");
  if (!username || !passwordHash || sessionSecret.length < 32) {
    throw new AuthError("As credenciais administrativas ainda não foram configuradas.", 503);
  }
  return { username, passwordHash, sessionSecret };
}

async function importHmacKey(secret) {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

async function passwordBytes(password, salt, iterations) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    256
  );
  return new Uint8Array(bits);
}

function sameBytes(left, right) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export async function verifyCredentials(inputUsername, password, env) {
  const { username, passwordHash } = await loadAuthConfiguration(env);
  const [iterationsValue, saltValue, expectedValue] = passwordHash.split(".");
  const iterations = Number(iterationsValue);
  if (!Number.isInteger(iterations) || iterations < 100000 || !saltValue || !expectedValue) {
    throw new AuthError("A senha administrativa foi configurada incorretamente.", 503);
  }

  const actual = await passwordBytes(String(password || ""), base64UrlToBytes(saltValue), iterations);
  const expected = base64UrlToBytes(expectedValue);
  return String(inputUsername || "") === username && sameBytes(actual, expected);
}

export async function createAdminSession(username, env) {
  const config = await loadAuthConfiguration(env);
  if (username !== config.username) throw new AuthError("Credenciais inválidas.", 401);
  const payload = bytesToBase64Url(
    encoder.encode(JSON.stringify({ sub: username, exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS }))
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", await importHmacKey(config.sessionSecret), encoder.encode(payload))
  );
  const token = `${payload}.${bytesToBase64Url(signature)}`;
  return `${COOKIE_NAME}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${SESSION_DURATION_SECONDS}`;
}

export function clearAdminSession() {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0`;
}

export async function authenticateAdmin(request, env) {
  const { username, sessionSecret } = await loadAuthConfiguration(env);
  const token = readCookie(request, COOKIE_NAME);
  const [payloadValue, signatureValue] = token.split(".");
  if (!payloadValue || !signatureValue) throw new AuthError("Entre com suas credenciais para continuar.", 401);

  const validSignature = await crypto.subtle.verify(
    "HMAC",
    await importHmacKey(sessionSecret),
    base64UrlToBytes(signatureValue),
    encoder.encode(payloadValue)
  );
  if (!validSignature) throw new AuthError("Sessão administrativa inválida.", 401);

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(base64UrlToBytes(payloadValue)));
  } catch {
    throw new AuthError("Sessão administrativa inválida.", 401);
  }

  if (payload.sub !== username || !payload.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    throw new AuthError("Sua sessão expirou. Entre novamente.", 401);
  }
  return { id: username, username, email: "" };
}
