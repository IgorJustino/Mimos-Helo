const jwksCache = new Map();

export class AuthError extends Error {
  constructor(message, status = 403) {
    super(message);
    this.status = status;
  }
}

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function decodeJson(value) {
  try {
    return JSON.parse(new TextDecoder().decode(decodeBase64Url(value)));
  } catch {
    throw new AuthError("Token de acesso inválido.");
  }
}

async function loadJwks(teamDomain) {
  const cached = jwksCache.get(teamDomain);
  if (cached && cached.expiresAt > Date.now()) return cached.keys;

  const response = await fetch(`${teamDomain}/cdn-cgi/access/certs`, {
    cf: { cacheTtl: 3600, cacheEverything: true }
  });
  if (!response.ok) throw new AuthError("Não foi possível validar o acesso administrativo.", 503);
  const body = await response.json();
  const keys = Array.isArray(body.keys) ? body.keys : [];
  jwksCache.set(teamDomain, { keys, expiresAt: Date.now() + 60 * 60 * 1000 });
  return keys;
}

function audienceMatches(tokenAudience, expectedAudience) {
  return Array.isArray(tokenAudience)
    ? tokenAudience.includes(expectedAudience)
    : tokenAudience === expectedAudience;
}

export async function authenticateAdmin(request, env) {
  const teamDomain = String(env.TEAM_DOMAIN || "").replace(/\/$/, "");
  const expectedAudience = String(env.POLICY_AUD || "");
  const allowedEmails = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  if (!teamDomain || !expectedAudience || !allowedEmails.length) {
    throw new AuthError("A proteção administrativa ainda não foi configurada.", 503);
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) throw new AuthError("Entre pelo endereço seguro do painel.", 401);

  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("Token de acesso inválido.");
  const header = decodeJson(parts[0]);
  const payload = decodeJson(parts[1]);
  if (header.alg !== "RS256" || !header.kid) throw new AuthError("Token de acesso inválido.");

  const keys = await loadJwks(teamDomain);
  const jwk = keys.find((candidate) => candidate.kid === header.kid);
  if (!jwk) throw new AuthError("A chave do acesso administrativo não foi reconhecida.");

  const publicKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const validSignature = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    publicKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  if (!validSignature) throw new AuthError("Assinatura do acesso inválida.");

  const now = Math.floor(Date.now() / 1000);
  if (payload.iss !== teamDomain) throw new AuthError("Emissor do acesso inválido.");
  if (!audienceMatches(payload.aud, expectedAudience)) throw new AuthError("Aplicação de acesso inválida.");
  if (!payload.exp || payload.exp <= now) throw new AuthError("Sua sessão expirou.", 401);
  if (payload.nbf && payload.nbf > now) throw new AuthError("Sua sessão ainda não é válida.");

  const email = String(payload.email || "").toLowerCase();
  if (!email || !allowedEmails.includes(email)) throw new AuthError("Este e-mail não administra o catálogo.");

  return { id: String(payload.sub || email), email };
}
