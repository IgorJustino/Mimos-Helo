const WHATSAPP_NUMBER = "5561996697056";
const CART_KEY = "mimos-helo-selection-v2";
const TELEMETRY_SESSION_KEY = "mimos-helo-telemetry-v1";

const FINISH_DESCRIPTIONS = {
  Brilhante: "Cores vibrantes, alto brilho e proteção contra desbotamento e desgaste.",
  Fosco: "Toque suave e aveludado, visual elegante e menos reflexos.",
  "Holográfico caquinho": "Fragmentos de brilho que mudam conforme a luz e o movimento.",
  "Holográfico confete": "Partículas delicadas e reluzentes para um efeito alegre."
};

const CATEGORY_LABELS = {
  "festas-celebracoes": "Festas & Celebrações",
  festas: "Festas & Celebrações",
  "papelaria-personalizacao": "Papelaria & Personalização",
  cadernetas: "Papelaria & Personalização",
  identificacao: "Papelaria & Personalização",
  acabamentos: "Papelaria & Personalização",
  "brindes-solucoes": "Brindes & Soluções Corporativas",
  outros: "Brindes & Soluções Corporativas",
  "impressao-3d": "Impressão 3D",
  presentes: "Presentes"
};

const CATEGORY_GROUPS = {
  "festas-celebracoes": ["festas-celebracoes", "festas"],
  "papelaria-personalizacao": ["papelaria-personalizacao", "cadernetas", "identificacao", "acabamentos"],
  "brindes-solucoes": ["brindes-solucoes", "outros"],
  "impressao-3d": ["impressao-3d"],
  presentes: ["presentes"]
};

let products = [];
let catalogState = "loading";

const productGrid = document.querySelector("#product-grid");
const cartDrawer = document.querySelector(".cart-drawer");
const cartContent = document.querySelector("#cart-content");
const cartFooter = document.querySelector("#cart-footer");
const cartTotal = document.querySelector("#cart-total");
const customizationDialog = document.querySelector("#customization-dialog");
const customizationDialogContent = document.querySelector("#customization-dialog-content");
const productDialog = document.querySelector("#product-dialog");
const productDialogContent = document.querySelector("#product-dialog-content");
const lightboxDialog = document.querySelector("#lightbox-dialog");
const toast = document.querySelector("#toast");
const catalogSearchInput = document.querySelector("[data-catalog-search]");
const clearSearchButton = document.querySelector("[data-clear-search]");
const catalogResultStatus = document.querySelector("[data-catalog-result-status]");

let selectedFilter = "todos";
let searchQuery = "";
let cart = loadCart();
let lastFocusedElement = null;
let customizationTrigger = null;
let editingCartIndex = null;
let toastTimer;

function loadTelemetrySession() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TELEMETRY_SESSION_KEY));
    return {
      catalogView: Boolean(saved?.catalogView),
      productViews: Array.isArray(saved?.productViews) ? saved.productViews : []
    };
  } catch {
    return { catalogView: false, productViews: [] };
  }
}

const telemetrySession = loadTelemetrySession();

function saveTelemetrySession() {
  try {
    sessionStorage.setItem(TELEMETRY_SESSION_KEY, JSON.stringify(telemetrySession));
  } catch {
    // Métricas nunca podem interromper a experiência de compra.
  }
}

function sendTelemetry(eventName, productSlugs = []) {
  const payload = JSON.stringify({ eventName, productSlugs });
  try {
    if (typeof navigator.sendBeacon === "function") {
      const accepted = navigator.sendBeacon("/api/telemetry", new Blob([payload], { type: "application/json" }));
      if (accepted) return;
    }
  } catch {
    // Alguns navegadores e bloqueadores desativam sendBeacon.
  }

  try {
    fetch("/api/telemetry", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true
    }).catch(() => {});
  } catch {
    // Telemetria é opcional e falha silenciosamente.
  }
}

function trackCatalogView() {
  if (telemetrySession.catalogView) return;
  telemetrySession.catalogView = true;
  saveTelemetrySession();
  sendTelemetry("catalog_view");
}

function trackProductView(product) {
  if (!product?.slug || telemetrySession.productViews.includes(product.slug)) return;
  telemetrySession.productViews.push(product.slug);
  saveTelemetrySession();
  sendTelemetry("product_view", [product.slug]);
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function loadCart() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(CART_KEY));
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
}

function saveCart() {
  try {
    sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
  } catch {
    // O carrinho continua funcional em memória quando o armazenamento é bloqueado.
  }
}

function getProduct(productId) {
  return products.find((product) => product.id === productId);
}

function getUnitPrice(product, option) {
  if (!product.optionPrices || !option) return product.price;
  const optionIndex = product.options.indexOf(option);
  return product.optionPrices[optionIndex] ?? product.price;
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

function getCategoryLabel(category) {
  return CATEGORY_LABELS[category] || "Soluções criativas";
}

function productMatchesFilter(product) {
  if (selectedFilter === "todos") return true;
  return (CATEGORY_GROUPS[selectedFilter] || [selectedFilter]).includes(product.category);
}

function productMatchesSearch(product) {
  if (!searchQuery) return true;
  const searchableText = [
    product.name,
    product.shortName,
    product.description,
    product.meta,
    getCategoryLabel(product.category),
    ...(product.options || []),
    ...(product.details || [])
  ].join(" ");
  return normalizeSearchText(searchableText).includes(searchQuery);
}

function updateCatalogStatus(count) {
  if (!catalogResultStatus) return;
  if (catalogState !== "ready" || !products.length) {
    catalogResultStatus.textContent = "";
    return;
  }
  const label = count === 1 ? "produto encontrado" : "produtos encontrados";
  catalogResultStatus.textContent = `${count} ${label}${searchQuery ? ` para “${catalogSearchInput?.value.trim()}”` : ""}.`;
}

function selectCatalogFilter(value, { scroll = false } = {}) {
  selectedFilter = value;
  document.querySelectorAll("[data-filter]").forEach((button) => {
    const isActive = button.dataset.filter === value;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
  renderProducts();
  if (scroll) document.querySelector("#produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderProducts() {
  if (catalogState === "loading") {
    updateCatalogStatus(0);
    productGrid.innerHTML = `
      <div class="catalog-empty-state catalog-loading-state" role="status">
        <span class="catalog-loader" aria-hidden="true"></span>
        <h3>Carregando o catálogo</h3>
        <p>Buscando os produtos disponíveis no ateliê.</p>
      </div>
    `;
    return;
  }

  if (catalogState === "error") {
    updateCatalogStatus(0);
    productGrid.innerHTML = `
      <div class="catalog-empty-state" role="alert">
        <span aria-hidden="true">!</span>
        <h3>Não foi possível abrir o catálogo</h3>
        <p>Tente atualizar a página. Se preferir, fale conosco pelo WhatsApp para consultar os produtos.</p>
      </div>
    `;
    return;
  }

  if (!products.length) {
    updateCatalogStatus(0);
    productGrid.innerHTML = `
      <div class="catalog-empty-state">
        <span aria-hidden="true">♡</span>
        <h3>Novidades chegando</h3>
        <p>O catálogo está sendo atualizado. Fale conosco pelo WhatsApp para consultar os produtos disponíveis.</p>
      </div>
    `;
    return;
  }

  const visibleProducts = products.filter((product) => productMatchesFilter(product) && productMatchesSearch(product));
  updateCatalogStatus(visibleProducts.length);

  if (!visibleProducts.length) {
    productGrid.innerHTML = `
      <div class="catalog-empty-state catalog-search-empty" role="status">
        <span aria-hidden="true">⌕</span>
        <h3>Nenhum produto encontrado</h3>
        <p>Tente outro termo ou escolha “Todos” para ver o catálogo completo.</p>
        <button class="button button-outline" type="button" data-reset-catalog>Limpar busca e filtros</button>
      </div>
    `;
    return;
  }

  productGrid.innerHTML = visibleProducts
    .map((product) => {
      return `
        <article class="product-card" data-product="${product.id}" data-category="${escapeHtml(product.category)}">
          <div class="product-media">
            ${product.image
              ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" loading="lazy" />`
              : `<div class="product-image-placeholder" aria-hidden="true">♡</div>`}
            ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
          </div>
          <div class="product-body">
            <span class="product-meta">${escapeHtml(getCategoryLabel(product.category))}</span>
            <div class="product-title-row">
              <h3>${escapeHtml(product.name)}</h3>
              <span class="product-price"><small>A partir de</small>${escapeHtml(product.priceLabel)}${product.priceNote ? `<em>${escapeHtml(product.priceNote)}</em>` : ""}</span>
            </div>
            <p class="product-description">${escapeHtml(product.description)}</p>
            <div class="product-actions">
              <button class="button button-primary" type="button" data-customize-product="${product.id}">Personalizar</button>
              <button class="details-button" type="button" data-show-product="${product.id}" aria-label="Ver detalhes de ${escapeHtml(product.name)}">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function getOptionDescription(product, option, index) {
  return product.optionDescriptions?.[index] || FINISH_DESCRIPTIONS[option] || "Escolha esta opção para personalizar seu produto.";
}

function getFieldAutocomplete(fieldId) {
  const values = {
    fullName: "name",
    birthDate: "bday",
    responsibleName: "name",
    responsiblePhone: "tel"
  };
  return values[fieldId] || "off";
}

function getCustomizationFieldType(field) {
  const supportedTypes = new Set(["text", "textarea", "select", "number", "date", "tel"]);
  const type = supportedTypes.has(field.type) ? field.type : "text";
  const identifiesAName =
    /name/i.test(String(field.id || "")) ||
    /^nome\b/i.test(String(field.label || "").trim());
  return identifiesAName ? "text" : type;
}

function renderCustomizationField(field, currentValue = "") {
  const fieldType = getCustomizationFieldType(field);
  const requiredMark = field.required ? '<span aria-hidden="true">*</span>' : '<small>(opcional)</small>';
  const commonAttributes = `name="${escapeHtml(field.id)}" id="custom-${escapeHtml(field.id)}" ${field.required ? "required" : ""}`;

  let control;
  if (fieldType === "textarea") {
    control = `<textarea ${commonAttributes} rows="3" maxlength="400" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(currentValue)}</textarea>`;
  } else if (fieldType === "select") {
    control = `
      <select ${commonAttributes}>
        ${field.options
          .map((option) => `<option value="${escapeHtml(option)}" ${currentValue === option ? "selected" : ""}>${escapeHtml(option)}</option>`)
          .join("")}
      </select>
    `;
  } else {
    control = `
      <input
        ${commonAttributes}
        type="${escapeHtml(fieldType)}"
        value="${escapeHtml(currentValue)}"
        placeholder="${escapeHtml(field.placeholder || "")}"
        autocomplete="${getFieldAutocomplete(field.id)}"
        ${fieldType === "tel" ? 'inputmode="tel" maxlength="20"' : 'maxlength="140"'}
      />
    `;
  }

  return `
    <label class="customization-field" for="custom-${escapeHtml(field.id)}">
      <span>${escapeHtml(field.label)} ${requiredMark}</span>
      ${control}
    </label>
  `;
}

function openCustomizationDialog(productId, cartIndex = null) {
  const product = getProduct(productId);
  if (!product) return;
  trackProductView(product);

  const existingItem = cartIndex === null ? null : cart[cartIndex];
  const selectedOption = existingItem?.option || product.options?.[0] || null;
  const savedCustomization = existingItem?.customization || {};
  editingCartIndex = cartIndex;
  customizationTrigger = productDialog.open
    ? document.querySelector(`[data-customize-product="${product.id}"]`)
    : document.activeElement;

  const optionChoices = product.options?.length
    ? `
      <fieldset class="customization-options">
        <legend>${escapeHtml(product.optionLabel)}</legend>
        <div class="customization-choice-grid ${product.options.length > 4 ? "is-compact" : ""}">
          ${product.options
            .map((option, index) => {
              const isChecked = option === selectedOption;
              const optionPrice = getUnitPrice(product, option);
              return `
                <label class="customization-choice">
                  <input type="radio" name="productOption" value="${escapeHtml(option)}" ${isChecked ? "checked" : ""} required />
                  <span class="customization-choice-body">
                    <span class="customization-choice-heading">
                      <strong>${escapeHtml(option)}</strong>
                      <span class="choice-check" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="m6 12 4 4 8-9"/></svg>
                      </span>
                    </span>
                    <small>${escapeHtml(getOptionDescription(product, option, index))}</small>
                    ${product.optionPrices ? `<em>${formatCurrency(optionPrice)}</em>` : ""}
                  </span>
                </label>
              `;
            })
            .join("")}
        </div>
      </fieldset>
    `
    : "";

  customizationDialogContent.innerHTML = `
    <form class="customization-form" id="customization-form" data-customization-product="${product.id}">
      <header class="customization-header">
        <div>
          <span>Personalização do item</span>
          <h2 id="customization-title">${escapeHtml(product.name)}</h2>
        </div>
        <button class="icon-button" type="button" data-close-customization aria-label="Fechar personalização">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" /></svg>
        </button>
      </header>

      <div class="customization-body">
        ${optionChoices}
        <div class="customization-fields">
          ${(product.customizationFields || []).map((field) => renderCustomizationField(field, savedCustomization[field.id] || "")).join("")}
        </div>
        ${
          product.customizationNotice
            ? `<div class="customization-notice">
                <svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/></svg>
                <span>${escapeHtml(product.customizationNotice)}</span>
              </div>`
            : ""
        }
        <p class="customization-privacy">
          <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>
          Seus dados ficam somente nesta sessão e são usados para montar a mensagem do WhatsApp.
        </p>
      </div>

      <footer class="customization-footer">
        <div>
          <span>Valor unitário</span>
          <strong data-customization-price>${formatCurrency(getUnitPrice(product, selectedOption))}</strong>
        </div>
        <button class="button button-primary" type="submit">
          <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M6 7h12l-1 13H7L6 7ZM9 7V5a3 3 0 0 1 6 0v2"/></svg>
          ${existingItem ? "Salvar alterações" : "Adicionar à seleção"}
        </button>
      </footer>
    </form>
  `;

  customizationDialog.showModal();
  window.setTimeout(() => customizationDialog.querySelector("input:checked, input, select, textarea")?.focus(), 80);
}

function closeCustomizationDialog() {
  if (!customizationDialog.open) return;
  customizationDialog.close();
}

function saveCustomization(event) {
  event.preventDefault();
  const form = event.target;
  const product = getProduct(form.dataset.customizationProduct);
  if (!product) return;

  const formData = new FormData(form);
  const option = formData.get("productOption") || product.options?.[0] || null;
  const wasEditing = editingCartIndex !== null;
  const customization = {};
  (product.customizationFields || []).forEach((field) => {
    customization[field.id] = String(formData.get(field.id) || "").trim();
  });

  if (editingCartIndex !== null && cart[editingCartIndex]) {
    cart[editingCartIndex] = {
      ...cart[editingCartIndex],
      productId: product.id,
      option,
      customization
    };
  } else {
    cart.push({ productId: product.id, option, customization, quantity: 1 });
  }

  saveCart();
  renderCart();
  if (!wasEditing) sendTelemetry("cart_add", [product.slug]);
  editingCartIndex = null;
  closeCustomizationDialog();
  showToast(`${product.shortName || product.name} ${wasEditing ? "atualizado" : "adicionado à seleção"}.`);
}

function changeQuantity(index, amount) {
  if (!cart[index]) return;
  cart[index].quantity += amount;
  if (cart[index].quantity <= 0) cart.splice(index, 1);
  saveCart();
  renderCart();
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  renderCart();
}

function formatCustomizationValue(field, value) {
  if (field.type !== "date" || !value) return value;
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function getCustomizationDetails(product, item) {
  return (product.customizationFields || [])
    .map((field) => ({ field, value: item.customization?.[field.id] || "" }))
    .filter(({ value }) => value);
}

function renderCart() {
  const availableItems = cart.filter((item) => getProduct(item.productId));
  const itemCount = availableItems.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = itemCount;
  });

  if (!availableItems.length) {
    cartContent.innerHTML = `
      <div class="empty-cart">
        <div class="empty-cart-mark" aria-hidden="true">+</div>
        <strong>Sua seleção está vazia</strong>
        <span>Escolha um produto para começar seu orçamento.</span>
      </div>
    `;
    cartFooter.classList.add("is-empty");
    cartTotal.textContent = formatCurrency(0);
    return;
  }

  let total = 0;
  cartContent.innerHTML = availableItems
    .map((item, index) => {
      const product = getProduct(item.productId);
      if (!product) return "";
      const unitPrice = getUnitPrice(product, item.option);
      const customizationDetails = getCustomizationDetails(product, item);
      total += unitPrice * item.quantity;
      return `
        <article class="cart-item">
          ${product.image
            ? `<img src="${escapeHtml(product.image)}" alt="" />`
            : `<div class="cart-image-placeholder" aria-hidden="true">♡</div>`}
          <div>
            <h3>${escapeHtml(product.shortName || product.name)}</h3>
            <div class="cart-item-customization">
              ${item.option ? `<span><strong>${escapeHtml(product.optionLabel)}:</strong> ${escapeHtml(item.option)}</span>` : ""}
              ${customizationDetails
                .slice(0, 2)
                .map(
                  ({ field, value }) =>
                    `<span><strong>${escapeHtml(field.label)}:</strong> ${escapeHtml(formatCustomizationValue(field, value))}</span>`
                )
                .join("")}
            </div>
            <div class="cart-quantity" aria-label="Quantidade de ${escapeHtml(product.shortName || product.name)}">
              <button type="button" data-cart-decrease="${index}" aria-label="Diminuir quantidade">−</button>
              <span>${item.quantity}</span>
              <button type="button" data-cart-increase="${index}" aria-label="Aumentar quantidade">+</button>
            </div>
            <button class="edit-item" type="button" data-cart-edit="${index}">Editar personalização</button>
          </div>
          <div class="cart-item-price">
            ${formatCurrency(unitPrice * item.quantity)}
            <button class="remove-item" type="button" data-cart-remove="${index}">remover</button>
          </div>
        </article>
      `;
    })
    .join("");

  cartFooter.classList.remove("is-empty");
  cartTotal.textContent = formatCurrency(total);
}

function openCart() {
  lastFocusedElement = document.activeElement;
  document.body.classList.add("drawer-open");
  cartDrawer.setAttribute("aria-hidden", "false");
  window.setTimeout(() => cartDrawer.querySelector("[data-close-cart]")?.focus(), 100);
}

function closeCart() {
  document.body.classList.remove("drawer-open");
  cartDrawer.setAttribute("aria-hidden", "true");
  lastFocusedElement?.focus();
}

function openProductDialog(productId) {
  const product = getProduct(productId);
  if (!product) return;
  trackProductView(product);

  productDialogContent.innerHTML = `
    <div class="product-dialog-layout">
      <div class="product-dialog-media">
        ${product.image
          ? `<img src="${escapeHtml(product.image)}" alt="${escapeHtml(product.alt)}" />`
          : `<div class="product-image-placeholder" aria-hidden="true">♡</div>`}
      </div>
      <div class="product-dialog-copy">
        <span class="eyebrow">${escapeHtml(product.meta)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <span class="dialog-price">${escapeHtml(product.priceLabel)} <small>${escapeHtml(product.priceNote)}</small></span>
        <p>${escapeHtml(product.description)}</p>
        <ul class="detail-list">
          ${(product.details || []).map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
        </ul>
        <p class="dialog-note">${escapeHtml(product.note)}</p>
        <button class="button button-primary" type="button" data-dialog-add="${product.id}">Personalizar produto</button>
      </div>
    </div>
  `;
  productDialog.showModal();
}

function closeProductDialog() {
  productDialog.close();
}

function openLightbox(source, alt) {
  const image = document.querySelector("#lightbox-image");
  image.src = source;
  image.alt = alt;
  lightboxDialog.showModal();
}

function sendToWhatsApp() {
  if (!cart.length) return;

  const productSlugs = [...new Set(cart.map((item) => getProduct(item.productId)?.slug).filter(Boolean))];
  sendTelemetry("whatsapp_click", productSlugs);

  let total = 0;
  const lines = cart.map((item, index) => {
    const product = getProduct(item.productId);
    const unitPrice = getUnitPrice(product, item.option);
    total += unitPrice * item.quantity;
    const customizationLines = getCustomizationDetails(product, item).map(
      ({ field, value }) => `  ${field.label}: ${formatCustomizationValue(field, value)}`
    );
    if (product.id === "cracha-inclusivo") {
      customizationLines.push("  Foto: enviarei uma foto nítida nesta conversa");
    }
    return [
      `${index + 1}. ${item.quantity}x ${product.shortName || product.name} (${formatCurrency(unitPrice * item.quantity)})`,
      ...(item.option ? [`  ${product.optionLabel}: ${item.option}`] : []),
      ...customizationLines
    ].join("\n");
  });

  const message = [
    "Olá, Mimos Helo! Vim pelo catálogo online e gostaria de pedir um orçamento:",
    "",
    ...lines,
    "",
    `Subtotal de referência: ${formatCurrency(total)}`,
    "",
    "Pode me informar a disponibilidade e o prazo, por favor?"
  ].join("\n");

  window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 2600);
}

async function loadRemoteCatalog() {
  if (!window.MimosCatalog) {
    catalogState = "error";
    renderProducts();
    renderCart();
    return;
  }

  try {
    const result = await window.MimosCatalog.listPublishedProducts();
    if (!result.configured) throw new Error("O banco do catálogo não está configurado.");
    products = result.products;
    catalogState = "ready";
    cart = cart.filter((item) => getProduct(item.productId));
    saveCart();
    renderProducts();
    renderCart();
    trackCatalogView();
  } catch (error) {
    catalogState = "error";
    cart = [];
    saveCart();
    renderProducts();
    renderCart();
    console.warn("O catálogo online não pôde ser carregado.", error);
  }
}

function initFeatureCarousel() {
  const carousel = document.querySelector("[data-feature-carousel]");
  if (!carousel) return;

  const tabs = [...carousel.querySelectorAll("[data-carousel-tab]")];
  const slides = [...carousel.querySelectorAll("[data-carousel-slide]")];
  const stage = carousel.querySelector("[data-carousel-stage]");
  const position = carousel.querySelector("[data-carousel-position]");
  const progress = carousel.querySelector("[data-carousel-progress]");
  const previousButtons = [...carousel.querySelectorAll("[data-carousel-prev]")];
  const nextButtons = [...carousel.querySelectorAll("[data-carousel-next]")];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const canHover = window.matchMedia("(hover: hover)").matches;
  const total = slides.length;

  let currentIndex = 0;
  let autoPlayTimer;
  let isVisible = true;
  let isInteracting = false;
  let pointerStartX = null;
  let didSwipe = false;

  const normalizeIndex = (index) => (index + total) % total;

  function syncAutoPlay() {
    window.clearInterval(autoPlayTimer);
    if (reducedMotion.matches || !isVisible || isInteracting || document.hidden) return;
    autoPlayTimer = window.setInterval(() => updateCarousel(currentIndex + 1), 4500);
  }

  function updateCarousel(nextIndex, moveTabIntoView = false) {
    currentIndex = normalizeIndex(nextIndex);
    const previousIndex = normalizeIndex(currentIndex - 1);
    const followingIndex = normalizeIndex(currentIndex + 1);

    slides.forEach((slide, index) => {
      slide.classList.remove("is-active", "is-prev", "is-next", "is-hidden");

      if (index === currentIndex) {
        slide.classList.add("is-active");
        slide.removeAttribute("aria-hidden");
      } else {
        slide.setAttribute("aria-hidden", "true");
        if (index === previousIndex) slide.classList.add("is-prev");
        else if (index === followingIndex) slide.classList.add("is-next");
        else slide.classList.add("is-hidden");
      }

      slide.querySelectorAll("button, a").forEach((control) => {
        control.tabIndex = index === currentIndex ? 0 : -1;
      });
    });

    tabs.forEach((tab, index) => {
      const isActive = index === currentIndex;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
      tab.tabIndex = isActive ? 0 : -1;
    });

    position.textContent = `${String(currentIndex + 1).padStart(2, "0")} / ${String(total).padStart(2, "0")}`;
    progress.style.width = `${((currentIndex + 1) / total) * 100}%`;

    if (moveTabIntoView && window.innerWidth <= 780) {
      tabs[currentIndex].scrollIntoView({
        behavior: reducedMotion.matches ? "auto" : "smooth",
        block: "nearest",
        inline: "center"
      });
    }

    syncAutoPlay();
  }

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => updateCarousel(index, true));
  });

  previousButtons.forEach((button) => button.addEventListener("click", () => updateCarousel(currentIndex - 1, true)));
  nextButtons.forEach((button) => button.addEventListener("click", () => updateCarousel(currentIndex + 1, true)));

  carousel.addEventListener("keydown", (event) => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    if (event.key === "Home") updateCarousel(0, true);
    else if (event.key === "End") updateCarousel(total - 1, true);
    else if (event.key === "ArrowLeft" || event.key === "ArrowUp") updateCarousel(currentIndex - 1, true);
    else updateCarousel(currentIndex + 1, true);
    tabs[currentIndex].focus({ preventScroll: true });
  });

  if (canHover) {
    carousel.addEventListener("pointerenter", () => {
      isInteracting = true;
      syncAutoPlay();
    });
    carousel.addEventListener("pointerleave", () => {
      isInteracting = false;
      syncAutoPlay();
    });
  }

  carousel.addEventListener("focusin", () => {
    isInteracting = true;
    syncAutoPlay();
  });

  carousel.addEventListener("focusout", () => {
    window.setTimeout(() => {
      isInteracting = carousel.contains(document.activeElement);
      syncAutoPlay();
    }, 0);
  });

  stage.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse") return;
    pointerStartX = event.clientX;
    didSwipe = false;
  });

  stage.addEventListener("pointerup", (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) < 45) return;
    didSwipe = true;
    updateCarousel(currentIndex + (distance < 0 ? 1 : -1), true);
  });

  stage.addEventListener(
    "click",
    (event) => {
      if (!didSwipe) return;
      event.preventDefault();
      event.stopPropagation();
      didSwipe = false;
    },
    true
  );

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && entry.intersectionRatio >= 0.2;
        syncAutoPlay();
      },
      { threshold: [0, 0.2, 0.6] }
    );
    observer.observe(carousel);
  }

  document.addEventListener("visibilitychange", syncAutoPlay);
  reducedMotion.addEventListener?.("change", syncAutoPlay);
  updateCarousel(0);
}

document.addEventListener("click", (event) => {
  const filterButton = event.target.closest("[data-filter]");
  if (filterButton) selectCatalogFilter(filterButton.dataset.filter);

  const categoryShortcut = event.target.closest("[data-category-shortcut]");
  if (categoryShortcut) selectCatalogFilter(categoryShortcut.dataset.categoryShortcut, { scroll: true });

  if (event.target.closest("[data-reset-catalog]")) {
    searchQuery = "";
    if (catalogSearchInput) catalogSearchInput.value = "";
    clearSearchButton?.setAttribute("hidden", "");
    selectCatalogFilter("todos");
    catalogSearchInput?.focus();
  }

  const customizeButton = event.target.closest("[data-customize-product]");
  if (customizeButton) openCustomizationDialog(customizeButton.dataset.customizeProduct);

  const detailButton = event.target.closest("[data-show-product]");
  if (detailButton) openProductDialog(detailButton.dataset.showProduct);

  const dialogAddButton = event.target.closest("[data-dialog-add]");
  if (dialogAddButton) {
    const productId = dialogAddButton.dataset.dialogAdd;
    closeProductDialog();
    openCustomizationDialog(productId);
  }

  const decreaseButton = event.target.closest("[data-cart-decrease]");
  if (decreaseButton) changeQuantity(Number(decreaseButton.dataset.cartDecrease), -1);

  const increaseButton = event.target.closest("[data-cart-increase]");
  if (increaseButton) changeQuantity(Number(increaseButton.dataset.cartIncrease), 1);

  const removeButton = event.target.closest("[data-cart-remove]");
  if (removeButton) removeFromCart(Number(removeButton.dataset.cartRemove));

  const editButton = event.target.closest("[data-cart-edit]");
  if (editButton) {
    const cartIndex = Number(editButton.dataset.cartEdit);
    const item = cart[cartIndex];
    if (item) {
      closeCart();
      openCustomizationDialog(item.productId, cartIndex);
    }
  }

  if (event.target.closest("[data-open-cart]")) openCart();
  if (event.target.closest("[data-close-cart]")) closeCart();
  if (event.target.closest("[data-close-customization]")) closeCustomizationDialog();
  if (event.target.closest("[data-close-dialog]")) closeProductDialog();

  const lightboxButton = event.target.closest("[data-lightbox]");
  if (lightboxButton) openLightbox(lightboxButton.dataset.lightbox, lightboxButton.dataset.alt);
  if (event.target.closest("[data-close-lightbox]")) lightboxDialog.close();
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("drawer-open")) closeCart();
});

catalogSearchInput?.addEventListener("input", () => {
  searchQuery = normalizeSearchText(catalogSearchInput.value);
  clearSearchButton?.toggleAttribute("hidden", !searchQuery);
  renderProducts();
});

catalogSearchInput?.addEventListener("keydown", (event) => {
  if (event.key !== "Enter") return;
  event.preventDefault();
  document.querySelector("#produtos")?.scrollIntoView({ behavior: "smooth", block: "start" });
});

clearSearchButton?.addEventListener("click", () => {
  catalogSearchInput.value = "";
  searchQuery = "";
  clearSearchButton.hidden = true;
  renderProducts();
  catalogSearchInput.focus();
});

productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) closeProductDialog();
});

customizationDialog.addEventListener("click", (event) => {
  if (event.target === customizationDialog) closeCustomizationDialog();
});

customizationDialog.addEventListener("change", (event) => {
  if (event.target.name !== "productOption") return;
  const form = customizationDialog.querySelector("#customization-form");
  const product = getProduct(form?.dataset.customizationProduct);
  const price = customizationDialog.querySelector("[data-customization-price]");
  if (product && price) price.textContent = formatCurrency(getUnitPrice(product, event.target.value));
});

customizationDialog.addEventListener("submit", saveCustomization);

customizationDialog.addEventListener("close", () => {
  editingCartIndex = null;
  customizationTrigger?.focus();
});

lightboxDialog.addEventListener("click", (event) => {
  if (event.target === lightboxDialog) lightboxDialog.close();
});

document.querySelector("#send-whatsapp").addEventListener("click", sendToWhatsApp);
document.querySelector("#current-year").textContent = new Date().getFullYear();

renderProducts();
renderCart();
initFeatureCarousel();
loadRemoteCatalog();
