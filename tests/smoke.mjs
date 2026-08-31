import { spawn } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";

const siteUrl = process.env.SITE_URL || "http://127.0.0.1:4173";
const debuggingPort = 9333;
const profileDirectory = await mkdtemp("/tmp/mimoshelo-chrome-");
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

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function connectToBrowser() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${debuggingPort}/json/list`);
      const pages = await response.json();
      const page = pages.find((candidate) => candidate.type === "page" && !candidate.url.startsWith("chrome-extension://"));
      if (page?.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch {
      // Chrome may still be starting.
    }
    await delay(100);
  }
  throw new Error("Chrome DevTools não iniciou.");
}

const socketUrl = await connectToBrowser();
const socket = new WebSocket(socketUrl);
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
  if (message.method === "Runtime.exceptionThrown") {
    browserErrors.push(message.params.exceptionDetails.text);
  }
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
  const result = await command("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

async function screenshot(path) {
  const result = await command("Page.captureScreenshot", {
    format: "png",
    captureBeyondViewport: false,
    fromSurface: true
  });
  await writeFile(path, Buffer.from(result.data, "base64"));
}

try {
  await command("Page.enable");
  await command("Runtime.enable");
  await command("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      window.__telemetryEvents = [];
      const nativeFetch = window.fetch.bind(window);
      window.fetch = async (...args) => {
        const response = await nativeFetch(...args);
        const url = String(args[0] instanceof Request ? args[0].url : args[0]);
        if (!url.includes('/api/products') || !response.ok) return response;
        const payload = await response.clone().json();
        const reforma = payload.products?.find((product) => product.id === 'reforma-luxo');
        if (reforma?.customization_fields?.[0]) reforma.customization_fields[0].type = 'number';
        return new Response(JSON.stringify(payload), {
          status: response.status,
          headers: { 'Content-Type': 'application/json' }
        });
      };
      Object.defineProperty(Navigator.prototype, 'sendBeacon', {
        configurable: true,
        value(url, body) {
          Promise.resolve(body?.text?.()).then((payload) => {
            window.__telemetryEvents.push({ url, payload: JSON.parse(payload || '{}') });
          });
          return true;
        }
      });
      if (location.search.includes('storage-blocked')) {
        Object.defineProperty(Navigator.prototype, 'sendBeacon', {
          configurable: true,
          value() { throw new Error('sendBeacon bloqueado para teste'); }
        });
        Storage.prototype.setItem = function setItemBlocked() {
          throw new Error('sessionStorage bloqueado para teste');
        };
      }
    `
  });
  await command("Emulation.setDeviceMetricsOverride", {
    width: 1440,
    height: 1000,
    deviceScaleFactor: 1,
    mobile: false
  });
  await command("Page.navigate", { url: siteUrl });
  await delay(2200);

  const pageState = await evaluate(`({
    url: location.href,
    readyState: document.readyState,
    productCount: document.querySelectorAll('.product-card').length,
    gridFound: Boolean(document.querySelector('#product-grid')),
    gridLength: document.querySelector('#product-grid')?.innerHTML.length || 0
  })`);
  assert(
    pageState.productCount === 6,
    `Os seis produtos não foram renderizados (${JSON.stringify(pageState)}; erros: ${browserErrors.join('; ')}).`
  );
  assert(
    await evaluate(`
      typeof products === 'undefined' &&
      !document.querySelector('.scallop') &&
      document.querySelectorAll('.category-ribbon button span').length === 0 &&
      Boolean(document.querySelector('meta[property="og:url"]')) &&
      Boolean(document.querySelector('meta[name="twitter:card"]'))
    `),
    "O encapsulamento, a limpeza do DOM ou os metadados sociais não foram aplicados."
  );

  assert(
    (await evaluate("document.querySelectorAll('[data-carousel-slide]').length")) === 5,
    "Os cinco itens do carrossel não foram renderizados."
  );
  assert(
    await evaluate(`
      document.querySelector('.hero').nextElementSibling === document.querySelector('.guide-section') &&
      document.querySelector('.guide-section').nextElementSibling === document.querySelector('#produtos')
    `),
    "O carrossel não está entre a apresentação inicial e os produtos."
  );
  await evaluate("document.querySelector('[data-carousel-tab=\"2\"]').click()");
  assert(
    (await evaluate("document.querySelector('.carousel-slide.is-active').dataset.carouselSlide")) === "2",
    "A navegação por assunto do carrossel não atualizou o cartão."
  );
  await evaluate("document.querySelector('[data-carousel-next]').click()");
  assert(
    (await evaluate("document.querySelector('.carousel-slide.is-active').dataset.carouselSlide")) === "3",
    "O controle de próximo do carrossel não funcionou."
  );

  const assetFailures = await evaluate(`Promise.all(
    [...new Set([...document.querySelectorAll('[src], [href]')]
      .map((node) => node.getAttribute('src') || node.getAttribute('href'))
      .filter((path) => path && path.startsWith('assets/')))]
      .map(async (path) => ({ path, status: (await fetch(path)).status }))
  ).then((items) => items.filter((item) => item.status !== 200))`);
  assert(assetFailures.length === 0, `Assets indisponíveis: ${JSON.stringify(assetFailures)}`);
  await screenshot("/tmp/mimoshelo-home-desktop.png");

  await evaluate(`
    document.querySelector('[data-customize-product="reforma-luxo"]').click();
    document.querySelector('[name="coverName"]').value = 'Maria Helena';
  `);
  assert(
    (await evaluate("document.querySelector('[name=\"coverName\"]').type")) === "text" &&
      (await evaluate("document.querySelector('[name=\"coverName\"]').value")) === "Maria Helena",
    "O campo de nome da capa não aceitou letras."
  );
  await evaluate("document.querySelector('#customization-dialog').close()");

  await evaluate(`
    window.open = (url) => { window.__openedWhatsApp = url; };
    document.querySelector('[data-customize-product="cracha-inclusivo"]').click();
  `);
  assert(await evaluate("document.querySelector('#customization-dialog').open"), "A personalização do crachá não abriu.");
  assert(
    (await evaluate("document.querySelectorAll('#customization-form .customization-field').length")) === 6,
    "Os campos de personalização do crachá não foram renderizados."
  );
  await screenshot("/tmp/mimoshelo-personalizacao-desktop.png");

  await evaluate(`
    document.querySelector('input[name="productOption"][value="Fosco"]').click();
    document.querySelector('[name="fullName"]').value = 'Lucas Gabriel da Silva';
    document.querySelector('[name="birthDate"]').value = '2017-04-15';
    document.querySelector('[name="responsibleName"]').value = 'Maria das Graças Silva';
    document.querySelector('[name="responsiblePhone"]').value = '(61) 99999-8888';
    document.querySelector('[name="diagnosis"]').value = 'CID 10: F84.0';
    document.querySelector('[name="notes"]').value = 'Prefiro detalhes em azul';
    document.querySelector('#customization-form').requestSubmit();
  `);
  assert((await evaluate("document.querySelector('[data-cart-count]').textContent")) === "1", "O contador do orçamento não atualizou.");
  assert(!(await evaluate("document.querySelector('#customization-dialog').open")), "A personalização não fechou após salvar.");

  await evaluate("document.querySelector('[data-open-cart]').click()");
  assert(await evaluate("document.body.classList.contains('drawer-open')"), "A gaveta do orçamento não abriu.");
  assert((await evaluate("document.querySelectorAll('.cart-item').length")) === 1, "O item não apareceu no orçamento.");
  assert(
    (await evaluate("document.querySelector('.cart-item-customization').textContent"))?.includes("Lucas Gabriel"),
    "O resumo da personalização não apareceu no carrinho."
  );

  await evaluate("document.querySelector('#send-whatsapp').click()");
  const whatsappUrl = await evaluate("decodeURIComponent(window.__openedWhatsApp || '')");
  assert(
    whatsappUrl.includes("Crachá inclusivo") && whatsappUrl.includes("Fosco") && whatsappUrl.includes("Lucas Gabriel da Silva"),
    "A mensagem do WhatsApp não contém produto, acabamento e personalização."
  );

  await evaluate("document.querySelector('[data-cart-edit]').click()");
  assert(await evaluate("document.querySelector('#customization-dialog').open"), "A edição da personalização não abriu.");
  assert(
    (await evaluate("document.querySelector('[name=\"fullName\"]').value")) === "Lucas Gabriel da Silva",
    "A edição não recuperou os dados já preenchidos."
  );
  await evaluate(`
    document.querySelector('[name="fullName"]').value = 'Lucas Gabriel Silva';
    document.querySelector('#customization-form').requestSubmit();
  `);
  assert((await evaluate("document.querySelector('[data-cart-count]').textContent")) === "1", "Editar a personalização duplicou o item.");

  await evaluate("document.querySelector('[data-close-cart]').click(); document.querySelector('[data-filter=\"festas-celebracoes\"]').click()");
  assert((await evaluate("document.querySelectorAll('.product-card').length")) === 3, "O filtro de festas não retornou três produtos.");

  await evaluate(`
    document.querySelector('[data-filter="todos"]').click();
    const search = document.querySelector('[data-catalog-search]');
    search.value = 'cracha';
    search.dispatchEvent(new Event('input', { bubbles: true }));
  `);
  assert(
    (await evaluate("document.querySelectorAll('.product-card').length")) === 1 &&
      (await evaluate("document.querySelector('[data-catalog-result-status]').textContent"))?.includes("1 produto"),
    "A busca do catálogo não encontrou o crachá sem depender de acentos."
  );
  await evaluate("document.querySelector('[data-clear-search]').click()");
  assert((await evaluate("document.querySelectorAll('.product-card').length")) === 6, "Limpar a busca não restaurou o catálogo.");
  await evaluate("document.documentElement.style.scrollBehavior = 'auto'; document.querySelector('#produtos').scrollIntoView({block: 'start'})");
  await delay(180);
  await screenshot("/tmp/mimoshelo-produtos-desktop.png");

  await evaluate("document.querySelector('[data-show-product=\"kit-classico\"]').click()");
  assert(await evaluate("document.querySelector('#product-dialog').open"), "A janela de detalhes não abriu.");
  await evaluate("document.querySelector('#product-dialog').close()");

  await delay(120);
  const telemetry = await evaluate("window.__telemetryEvents");
  const telemetryNames = telemetry.map((item) => item.payload.eventName);
  assert(telemetryNames.filter((name) => name === "catalog_view").length === 1, "A visita ao catálogo não foi registrada uma única vez.");
  assert(telemetryNames.filter((name) => name === "cart_add").length === 1, "Adicionar ou editar o carrinho gerou telemetria incorreta.");
  assert(telemetryNames.filter((name) => name === "whatsapp_click").length === 1, "O clique no WhatsApp não foi registrado.");
  assert(
    !JSON.stringify(telemetry).includes("Lucas Gabriel") && !JSON.stringify(telemetry).includes("99999-8888"),
    "Dados pessoais foram enviados na telemetria."
  );

  await evaluate(`
    document.documentElement.style.scrollBehavior = 'auto';
    document.querySelector('[data-carousel-tab="1"]').click();
    document.querySelector('[data-open-cart]').click();
    document.querySelector('[data-cart-remove]')?.click();
    document.querySelector('[data-close-cart]').click();
    document.querySelector('#toast').classList.remove('is-visible');
    document.querySelector('[data-feature-carousel]').scrollIntoView({block: 'start'});
  `);
  await delay(350);
  await screenshot("/tmp/mimoshelo-carrossel-desktop.png");

  const smartphoneSizes = [
    { width: 320, height: 568, label: "compacto" },
    { width: 360, height: 800, label: "padrao" },
    { width: 390, height: 844, label: "moderno" },
    { width: 430, height: 932, label: "grande" }
  ];

  for (const size of smartphoneSizes) {
    await command("Emulation.setDeviceMetricsOverride", {
      width: size.width,
      height: size.height,
      deviceScaleFactor: 1,
      mobile: true
    });
    await evaluate("document.documentElement.style.scrollBehavior = 'auto'; window.scrollTo(0, 0)");
    await delay(180);

    const mobileMetrics = await evaluate(`({
      viewportWidth: document.documentElement.clientWidth,
      viewportHeight: window.innerHeight,
      contentWidth: document.documentElement.scrollWidth,
      overflowElements: [...document.body.querySelectorAll('*')]
        .map((element) => ({
          selector: element.id ? '#' + element.id : element.className ? '.' + String(element.className).trim().replaceAll(' ', '.') : element.tagName,
          rect: element.getBoundingClientRect()
        }))
        .filter((item) => item.rect.right > document.documentElement.clientWidth + 1 || item.rect.left < -1)
        .slice(0, 8)
        .map((item) => ({ selector: item.selector, left: item.rect.left, right: item.rect.right, width: item.rect.width })),
      cartButton: (() => {
        const rect = document.querySelector('.cart-fab').getBoundingClientRect();
        return { left: rect.left, right: rect.right, bottom: rect.bottom };
      })()
    })`);
    assert(
      mobileMetrics.contentWidth <= mobileMetrics.viewportWidth,
      `A página possui overflow horizontal em ${size.width}px: ${JSON.stringify(mobileMetrics)}`
    );
    assert(
      mobileMetrics.cartButton.left >= 0 &&
        mobileMetrics.cartButton.right <= mobileMetrics.viewportWidth &&
        mobileMetrics.cartButton.bottom <= mobileMetrics.viewportHeight,
      `O botão fixo do orçamento saiu da tela em ${size.width}px: ${JSON.stringify(mobileMetrics)}`
    );

    await evaluate("document.querySelector('[data-customize-product=\"cracha-inclusivo\"]').click()");
    await delay(180);
    const dialogMetrics = await evaluate(`(() => {
      const dialog = document.querySelector('#customization-dialog');
      const rect = dialog.getBoundingClientRect();
      const footerRect = dialog.querySelector('.customization-footer').getBoundingClientRect();
      return {
        open: dialog.open,
        viewportWidth: document.documentElement.clientWidth,
        viewportHeight: window.innerHeight,
        rect: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom },
        footer: { left: footerRect.left, right: footerRect.right, bottom: footerRect.bottom }
      };
    })()`);
    assert(dialogMetrics.open, `A personalização não abriu em ${size.width}px.`);
    assert(
      dialogMetrics.rect.left >= 0 &&
        dialogMetrics.rect.right <= dialogMetrics.viewportWidth &&
        dialogMetrics.rect.top >= 0 &&
        dialogMetrics.rect.bottom <= dialogMetrics.viewportHeight + 1,
      `A personalização saiu da tela em ${size.width}px: ${JSON.stringify(dialogMetrics)}`
    );
    assert(
      dialogMetrics.footer.left >= 0 &&
        dialogMetrics.footer.right <= dialogMetrics.viewportWidth &&
        dialogMetrics.footer.bottom <= dialogMetrics.viewportHeight + 1,
      `O rodapé da personalização saiu da tela em ${size.width}px: ${JSON.stringify(dialogMetrics)}`
    );

    if (size.width === 320) await screenshot("/tmp/mimoshelo-smartphone-320.png");
    if (size.width === 390) await screenshot("/tmp/mimoshelo-personalizacao-mobile.png");
    await evaluate("document.querySelector('#customization-dialog').close()");
  }

  await command("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 1,
    mobile: true
  });
  await evaluate("window.scrollTo(0, 0)");
  await delay(180);
  await screenshot("/tmp/mimoshelo-mobile-reviewed.png");

  await evaluate("document.querySelector('#produtos').scrollIntoView({block: 'start'})");
  await delay(180);
  await screenshot("/tmp/mimoshelo-produtos-mobile.png");

  await evaluate("document.querySelector('[data-feature-carousel]').scrollIntoView({block: 'start'})");
  await delay(350);
  await screenshot("/tmp/mimoshelo-carrossel-mobile.png");

  const dynamicCatalogState = await evaluate(`(() => {
    const product = window.MimosCatalog.normalizeProduct({
      id: 'produto-dinamico',
      slug: 'produto-dinamico',
      category: 'outros',
      name: 'Produto vindo do painel',
      price: 29.9,
      image_url: 'assets/images/guide/laminacao-bopp.jpeg',
      options: ['Modelo A'],
      option_prices: [31.5],
      option_descriptions: ['Modelo de teste'],
      customization_fields: [{ id: 'nome', label: 'Nome', type: 'text', required: true }],
      details: [],
      published: true,
      sort_order: 1
    });
    return {
      name: product.name,
      price: product.optionPrices[0],
      fieldLabel: product.customizationFields[0].label
    };
  })()`);
  assert(
    dynamicCatalogState.name === "Produto vindo do painel" &&
      dynamicCatalogState.price === 31.5 &&
      dynamicCatalogState.fieldLabel === "Nome",
    `Os dados dinâmicos do painel não foram convertidos corretamente: ${JSON.stringify(dynamicCatalogState)}`
  );

  await evaluate("sessionStorage.clear()");
  await command("Page.navigate", { url: `${siteUrl}/?storage-blocked=1` });
  await delay(1800);
  assert(
    (await evaluate("document.querySelectorAll('.product-card').length")) === 6,
    "O catálogo falhou quando o navegador bloqueou telemetria e sessionStorage."
  );

  assert(browserErrors.length === 0, `Erros no navegador: ${browserErrors.join('; ')}`);
  console.log("Smoke test aprovado: catálogo dinâmico, personalização, edição, carrossel, assets, orçamento e WhatsApp.");
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
