import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

const siteUrl = process.env.SITE_URL || "http://127.0.0.1:4173";
const debuggingPort = 9334;
const profileDirectory = await mkdtemp("/tmp/mimoshelo-admin-chrome-");
const browser = spawn(
  "/usr/bin/google-chrome",
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    `--remote-debugging-port=${debuggingPort}`,
    `--user-data-dir=${profileDirectory}`,
    "about:blank"
  ],
  { stdio: ["ignore", "ignore", "ignore"] }
);

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

async function connectToBrowser() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
      const pages = await response.json();
      const page = pages.find((candidate) => candidate.type === "page");
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome may still be starting.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools não iniciou.");
}

const socket = new WebSocket(await connectToBrowser());
const pending = new Map();
const browserErrors = [];
let commandId = 0;

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }
  if (message.method === "Runtime.exceptionThrown") browserErrors.push(message.params.exceptionDetails.text);
});

await new Promise((resolve, reject) => {
  socket.addEventListener("open", resolve, { once: true });
  socket.addEventListener("error", reject, { once: true });
});

function command(method, params = {}) {
  commandId += 1;
  socket.send(JSON.stringify({ id: commandId, method, params }));
  return new Promise((resolve, reject) => pending.set(commandId, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(path) {
  const result = await command("Page.captureScreenshot", { format: "png", captureBeyondViewport: false, fromSurface: true });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

const supabaseMock = `
  (() => {
    window.MIMOS_HELO_CONFIG = {
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_publishable_test'
    };
    const user = { id: 'admin-user-id', email: 'helo@example.com' };
    let products = [{
      id: 'produto-teste', slug: 'produto-teste', category: 'cadernetas', badge: 'Destaque',
      meta: 'Caderneta', name: 'Produto de teste', short_name: '', price: 42, price_note: 'no Pix',
      image_url: 'assets/images/reforma-luxo.jpeg', image_path: '', image_alt: 'Produto de teste',
      description: 'Descrição do produto de teste.', option_label: 'Acabamento',
      options: ['Brilhante'], option_prices: [42], option_descriptions: ['Acabamento brilhante'],
      customization_fields: [], customization_notice: '', details: ['Feito sob encomenda'], note: '',
      published: true, sort_order: 10, created_at: '2026-08-18T00:00:00Z', updated_at: '2026-08-18T00:00:00Z'
    }];

    function query(table) {
      let action = 'select';
      let payload = null;
      const filters = {};
      const result = () => {
        if (table === 'admin_users') return { data: { user_id: user.id }, error: null };
        if (action === 'upsert') {
          const row = { ...payload, id: payload.id || 'novo-produto-id', created_at: '2026-08-18T00:00:00Z', updated_at: '2026-08-18T00:00:00Z' };
          const index = products.findIndex((item) => item.id === row.id);
          if (index >= 0) products[index] = row;
          else products.push(row);
          return { data: row, error: null };
        }
        if (action === 'delete') {
          products = products.filter((item) => item.id !== filters.id);
          return { data: null, error: null };
        }
        let data = [...products];
        Object.entries(filters).forEach(([key, value]) => { data = data.filter((item) => item[key] === value); });
        return { data, error: null };
      };
      const chain = {
        select() { return chain; },
        order() { return chain; },
        eq(key, value) { filters[key] = value; return chain; },
        upsert(row) { action = 'upsert'; payload = row; return chain; },
        delete() { action = 'delete'; return chain; },
        maybeSingle() { return Promise.resolve(result()); },
        single() { return Promise.resolve(result()); },
        then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); }
      };
      return chain;
    }

    window.supabase = {
      createClient() {
        return {
          auth: {
            getUser: async () => ({ data: { user }, error: null }),
            signInWithPassword: async () => ({ data: { user }, error: null }),
            signOut: async () => ({ error: null })
          },
          from: query,
          storage: {
            from() {
              return {
                upload: async () => ({ data: { path: 'catalogo/teste.jpg' }, error: null }),
                getPublicUrl: () => ({ data: { publicUrl: 'assets/images/reforma-luxo.jpeg' } })
              };
            }
          }
        };
      }
    };
  })();
`;

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Page.addScriptToEvaluateOnNewDocument", { source: supabaseMock });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `${siteUrl}/admin.html` });
  await delay(1800);

  assert(!(await evaluate("document.querySelector('[data-admin-workspace]').hidden")), "O painel autenticado não abriu.");
  assert((await evaluate("document.querySelectorAll('.admin-product-card').length")) === 1, "A lista de produtos do painel não carregou.");
  assert((await evaluate("document.querySelector('[name=\"name\"]').value")) === "Produto de teste", "O editor não recebeu os dados do produto.");

  await evaluate(`
    document.querySelector('[name="name"]').value = 'Produto atualizado';
    document.querySelector('[name="name"]').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-add-option]').click();
    const newOption = [...document.querySelectorAll('[data-option-name]')].at(-1);
    newOption.value = 'Fosco';
    newOption.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-product-form]').requestSubmit();
  `);
  await delay(400);
  assert((await evaluate("document.querySelector('[data-editor-title]').textContent")) === "Produto atualizado", "O produto editado não foi salvo.");
  assert((await evaluate("document.querySelectorAll('[data-option-name]').length")) === 2, "A nova opção não foi salva.");

  await screenshot("/tmp/mimoshelo-admin-desktop.png");

  await command("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await delay(250);
  const mobileMetrics = await evaluate(`({
    viewportWidth: document.documentElement.clientWidth,
    contentWidth: document.documentElement.scrollWidth,
    saveButtonVisible: (() => {
      const rect = document.querySelector('.editor-footer [data-save-product]').getBoundingClientRect();
      return rect.left >= 0 && rect.right <= innerWidth && rect.bottom <= innerHeight + 1;
    })()
  })`);
  assert(mobileMetrics.contentWidth <= mobileMetrics.viewportWidth, `O painel possui overflow horizontal: ${JSON.stringify(mobileMetrics)}`);
  assert(mobileMetrics.saveButtonVisible, "O botão de salvar não ficou acessível no celular.");
  await screenshot("/tmp/mimoshelo-admin-mobile.png");

  assert(browserErrors.length === 0, `Erros no painel: ${browserErrors.join("; ")}`);
  console.log("Painel aprovado: autenticação, listagem, edição, opções e layout mobile.");
} finally {
  socket.close();
  const browserExited = new Promise((resolve) => browser.once("exit", resolve));
  browser.kill("SIGTERM");
  await Promise.race([browserExited, delay(2000)]);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await rm(profileDirectory, { recursive: true, force: true });
      break;
    } catch (error) {
      if (attempt === 2) throw error;
      await delay(200);
    }
  }
}
