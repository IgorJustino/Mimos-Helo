import { spawn } from "node:child_process";
import { mkdtemp, rm, stat, writeFile } from "node:fs/promises";

const siteUrl = process.env.SITE_URL || "http://127.0.0.1:4173";
const debuggingPort = 9334;
const profileDirectory = await mkdtemp("/tmp/mimoshelo-admin-chrome-");
const sampleImagePath = new URL("./fixtures/sample-product.jpeg", import.meta.url).pathname;
const sampleImageSize = (await stat(sampleImagePath)).size;
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

const cloudflareApiMock = `
  (() => {
    const user = { id: 'admin-user-id', email: 'helo@example.com' };
    let authenticated = false;
    let products = [{
      id: 'produto-teste', slug: 'produto-teste', category: 'cadernetas', badge: 'Destaque',
      meta: 'Caderneta', name: 'Produto de teste', short_name: '', price: 42, price_note: 'no Pix',
      image_url: 'assets/images/brand/mimos-helo-monogram.png', image_path: '', image_alt: 'Produto de teste',
      description: 'Descrição do produto de teste.', option_label: 'Acabamento',
      options: ['Brilhante'], option_prices: [42], option_descriptions: ['Acabamento brilhante'],
      customization_fields: [], customization_notice: '', details: ['Feito sob encomenda'], note: '',
      published: true, sort_order: 10, created_at: '2026-08-18T00:00:00Z', updated_at: '2026-08-18T00:00:00Z'
    }];

    const nativeFetch = window.fetch.bind(window);
    const json = (value, status = 200) => Promise.resolve(new Response(JSON.stringify(value), {
      status,
      headers: { 'Content-Type': 'application/json' }
    }));

    window.fetch = async (input, options = {}) => {
      const url = new URL(typeof input === 'string' ? input : input.url, location.href);
      if (!url.pathname.startsWith('/api/')) return nativeFetch(input, options);
      if (url.pathname === '/api/health') return json({ configured: true, database: 'cloudflare-d1', storage: 'cloudflare-r2' });
      if (url.pathname === '/api/admin/me') {
        return authenticated ? json({ user }) : json({ error: 'Entre com suas credenciais para continuar.' }, 401);
      }
      if (url.pathname === '/api/admin/login' && options.method === 'POST') {
        const credentials = JSON.parse(options.body);
        if (credentials.username !== 'admin-mimos' || credentials.password !== 'senha-segura-teste') {
          return json({ error: 'Usuário ou senha incorretos.' }, 401);
        }
        authenticated = true;
        return json({ user });
      }
      if (url.pathname === '/api/admin/logout' && options.method === 'POST') {
        authenticated = false;
        return json({ signedOut: true });
      }
      if (url.pathname === '/api/admin/images' && options.method === 'POST') {
        const image = options.body.get('image');
        window.__uploadedImage = { name: image.name, type: image.type, size: image.size };
        return json({ path: 'pending/teste.webp', publicUrl: 'assets/images/brand/mimos-helo-monogram.png' }, 201);
      }
      if (url.pathname === '/api/admin/analytics') {
        return json({
          periodDays: 30,
          totals: { catalog_view: 100, product_view: 62, cart_add: 18, whatsapp_click: 5 },
          products: [{ slug: 'produto-teste', name: 'Produto de teste', productViews: 42, cartAdds: 12, whatsappClicks: 4 }]
        });
      }
      if (url.pathname === '/api/admin/products' && (!options.method || options.method === 'GET')) {
        return json({ products });
      }
      if (url.pathname === '/api/admin/products' && options.method === 'POST') {
        const payload = JSON.parse(options.body);
        const row = { ...payload, id: payload.id || 'novo-produto-id', created_at: '2026-08-18T00:00:00Z', updated_at: '2026-08-18T00:00:00Z' };
        const index = products.findIndex((item) => item.id === row.id);
        if (index >= 0) products[index] = row;
        else products.push(row);
        return json({ product: row });
      }
      if (url.pathname.startsWith('/api/admin/products/') && options.method === 'DELETE') {
        const id = decodeURIComponent(url.pathname.split('/').at(-1));
        products = products.filter((item) => item.id !== id);
        return json({ deleted: true });
      }
      return json({ error: 'Rota não simulada.' }, 404);
    };
  })();
`;

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Page.addScriptToEvaluateOnNewDocument", { source: cloudflareApiMock });
  await command("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await command("Page.navigate", { url: `${siteUrl}/admin` });
  await delay(1800);

  assert(
    await evaluate(`
      [...document.styleSheets].some((sheet) => sheet.href?.endsWith('/assets/css/base.css')) &&
      ![...document.styleSheets].some((sheet) => sheet.href?.endsWith('/assets/css/storefront.css'))
    `),
    "O painel não isolou seus estilos da vitrine."
  );
  assert(!(await evaluate("document.querySelector('[data-admin-login]').hidden")), "O formulário de login não abriu.");
  await evaluate(`
    document.querySelector('[name="username"]').value = 'admin-mimos';
    document.querySelector('[name="password"]').value = 'senha-segura-teste';
    document.querySelector('[data-login-form]').requestSubmit();
  `);
  await delay(500);
  assert(!(await evaluate("document.querySelector('[data-admin-workspace]').hidden")), "O painel autenticado não abriu.");
  assert((await evaluate("document.querySelectorAll('.admin-product-card').length")) === 1, "A lista de produtos do painel não carregou.");
  assert((await evaluate("document.querySelector('[name=\"name\"]').value")) === "Produto de teste", "O editor não recebeu os dados do produto.");
  assert((await evaluate("document.querySelector('[data-analytics-value=\"catalog_view\"]').textContent")) === "100", "As visitas do funil não carregaram.");
  assert((await evaluate("document.querySelector('[data-analytics-conversion]').textContent")) === "5%", "A conversão do funil foi calculada incorretamente.");
  assert((await evaluate("document.querySelector('[data-analytics-highlight]').textContent"))?.includes("Produto de teste"), "O destaque do funil não carregou.");

  await command("DOM.enable");
  const { root } = await command("DOM.getDocument");
  const { nodeId: imageInputNodeId } = await command("DOM.querySelector", {
    nodeId: root.nodeId,
    selector: '[name="imageFile"]'
  });
  await command("DOM.setFileInputFiles", { nodeId: imageInputNodeId, files: [sampleImagePath] });

  await evaluate(`
    document.querySelector('[name="name"]').value = 'Produto atualizado';
    document.querySelector('[name="name"]').dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-add-option]').click();
    const newOption = [...document.querySelectorAll('[data-option-name]')].at(-1);
    newOption.value = 'Fosco';
    newOption.dispatchEvent(new Event('input', { bubbles: true }));
    document.querySelector('[data-product-form]').requestSubmit();
  `);
  await delay(1400);
  assert((await evaluate("document.querySelector('[data-editor-title]').textContent")) === "Produto atualizado", "O produto editado não foi salvo.");
  assert((await evaluate("document.querySelectorAll('[data-option-name]').length")) === 2, "A nova opção não foi salva.");
  const uploadedImage = await evaluate("window.__uploadedImage");
  assert(uploadedImage?.size <= sampleImageSize, `A imagem otimizada ficou maior que a original: ${JSON.stringify(uploadedImage)}`);
  assert(["image/webp", "image/jpeg"].includes(uploadedImage?.type), `O formato otimizado é inválido: ${JSON.stringify(uploadedImage)}`);

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
  console.log("Painel aprovado: autenticação, métricas, edição, opções e layout mobile.");
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
