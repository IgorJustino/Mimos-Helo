export function json(data, init = {}) {
  const headers = new Headers(init.headers || {});
  headers.set("Content-Type", "application/json; charset=utf-8");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(JSON.stringify(data), { ...init, headers });
}

export function errorResponse(error) {
  const status = Number(error?.status || 500);
  const exposeMessage = status >= 400 && status < 500;
  return json(
    { error: exposeMessage ? error.message : "Não foi possível concluir esta operação." },
    { status }
  );
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    throw Object.assign(new Error("Envie os dados em formato JSON."), { status: 415 });
  }

  try {
    return await request.json();
  } catch {
    throw Object.assign(new Error("Os dados enviados não são válidos."), { status: 400 });
  }
}

export function requireBindings(env, names) {
  const missing = names.filter((name) => !env[name]);
  if (missing.length) {
    throw Object.assign(new Error(`Bindings ausentes: ${missing.join(", ")}.`), { status: 503 });
  }
}
