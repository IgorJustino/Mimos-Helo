const WHATSAPP_NUMBER = "5561996697056";
const CART_KEY = "mimos-helo-selection-v2";

const guideSection = document.querySelector(".guide-section");
const productsSection = document.querySelector("#produtos");

if (guideSection && productsSection) {
  productsSection.before(guideSection);
}

const FINISH_DESCRIPTIONS = {
  Brilhante: "Cores vibrantes, alto brilho e proteção contra desbotamento e desgaste.",
  Fosco: "Toque suave e aveludado, visual elegante e menos reflexos.",
  "Holográfico caquinho": "Fragmentos de brilho que mudam conforme a luz e o movimento.",
  "Holográfico confete": "Partículas delicadas e reluzentes para um efeito alegre."
};

const PARTY_CUSTOMIZATION_FIELDS = [
  {
    id: "themeReference",
    label: "Tema ou referência do catálogo",
    type: "text",
    placeholder: "Ex.: Safari, referência da página 12",
    required: true
  },
  {
    id: "nameAndAge",
    label: "Nome e idade para personalização",
    type: "text",
    placeholder: "Ex.: Helena, 5 anos",
    required: true
  },
  {
    id: "eventDate",
    label: "Data do evento",
    type: "date",
    required: true
  },
  {
    id: "notes",
    label: "Observações ou preferências adicionais",
    type: "textarea",
    placeholder: "Ex.: cores preferidas, detalhes do tema ou mensagem especial",
    required: false
  }
];

const products = [
  {
    id: "reforma-luxo",
    category: "cadernetas",
    badge: "Mais escolhido",
    meta: "Caderneta de saúde",
    name: "Reforma luxo",
    price: 70,
    priceLabel: "R$ 70",
    priceNote: "Pix/dinheiro",
    image: "assets/images/reforma-luxo.jpeg",
    alt: "Reforma luxo de duas cadernetas de saúde personalizadas",
    description: "Capa nova e completa, mantendo o miolo original da caderneta do bebê.",
    optionLabel: "Acabamento da capa",
    options: ["Brilhante", "Fosco", "Holográfico caquinho", "Holográfico confete"],
    customizationFields: [
      {
        id: "coverName",
        label: "Nome para colocar na capa",
        type: "text",
        placeholder: "Ex.: João Gabriel",
        required: true
      },
      {
        id: "themeReference",
        label: "Tema ou referência do catálogo",
        type: "text",
        placeholder: "Ex.: Ursinho príncipe, referência 1A22",
        required: true
      },
      {
        id: "wireColor",
        label: "Preferência de cor do wire-o",
        type: "select",
        options: ["Sem preferência", "Branco", "Rosa", "Cobre"],
        required: false
      },
      {
        id: "notes",
        label: "Observações ou preferências adicionais",
        type: "textarea",
        placeholder: "Ex.: detalhes de cor, nome do pingente ou outra preferência",
        required: false
      }
    ],
    customizationNotice: "A reforma troca a capa e preserva o miolo original da caderneta.",
    details: [
      "Capa dura personalizada com qualquer arte disponível no catálogo",
      "Wire-o branco premium, com rosa ou cobre conforme disponibilidade",
      "Elástico com passante, tassel ou pingente e divisórias com abas",
      "Bolso canguru interno e folhas adicionais para consultas e anotações",
      "Laminação brilhante, fosca ou holográfica",
      "Cartão do SUS no mesmo tema como brinde"
    ],
    note: "Prazo estimado de 1 a 10 dias úteis, conforme a agenda. No cartão: R$ 75,00."
  },
  {
    id: "cracha-inclusivo",
    category: "identificacao",
    badge: "Produção em 2 dias",
    meta: "Identificação inclusiva",
    name: "Crachá para autismo e outras necessidades",
    shortName: "Crachá inclusivo",
    price: 35,
    priceLabel: "R$ 35",
    priceNote: "cordão incluso",
    image: "assets/images/cracha-autismo.jpeg",
    alt: "Frente e verso de crachá de identificação para autismo",
    description: "Polímero sublimado, mais grosso que PVC, resistente e à prova d’água.",
    optionLabel: "Acabamento",
    options: ["Brilhante", "Fosco", "Holográfico caquinho", "Holográfico confete"],
    customizationFields: [
      {
        id: "fullName",
        label: "Nome completo da pessoa",
        type: "text",
        placeholder: "Ex.: Lucas Gabriel da Silva",
        required: true
      },
      {
        id: "birthDate",
        label: "Data de nascimento",
        type: "date",
        required: true
      },
      {
        id: "responsibleName",
        label: "Nome do responsável",
        type: "text",
        placeholder: "Ex.: Maria das Graças Silva",
        required: true
      },
      {
        id: "responsiblePhone",
        label: "Telefone do responsável com DDD",
        type: "tel",
        placeholder: "Ex.: (61) 99999-8888",
        required: true
      },
      {
        id: "diagnosis",
        label: "CID, diagnóstico ou laudo",
        type: "text",
        placeholder: "Ex.: CID 10: F84.0 — Transtorno do Espectro Autista",
        required: true
      },
      {
        id: "notes",
        label: "Observações ou preferências adicionais",
        type: "textarea",
        placeholder: "Ex.: prefiro detalhes azuis ou gostaria de incluir uma mensagem",
        required: false
      }
    ],
    customizationNotice: "Após enviar o pedido pelo WhatsApp, mande também uma foto nítida, de preferência com fundo branco.",
    details: [
      "Inclui cordão de Autismo",
      "Enviar nome completo e data de nascimento",
      "Enviar nome e telefone de um responsável",
      "Enviar CID ou laudo",
      "Enviar foto nítida, preferencialmente com fundo branco",
      "Produção em até 2 dias úteis após a confirmação",
      "Crachás empresariais são normalmente produzidos em PVC",
      "Para outras artes, envie o arquivo pronto para sublimação"
    ],
    note: "Pagamento de 50% antecipado para confirmar. Modelo padrão, sem QR Code ou campos extras."
  },
  {
    id: "kit-classico",
    category: "festas",
    badge: "Pedido mínimo",
    meta: "Papelaria para festas",
    name: "Monte seu kit clássico",
    price: 35,
    priceLabel: "R$ 35",
    priceNote: "kit 10 un. no Pix",
    image: "assets/images/kit-classico.jpg",
    alt: "Modelos e preços do kit clássico para festas",
    description: "Caixinhas em papel offset fosco, com modelos à sua escolha e impressão em alta qualidade.",
    optionLabel: "Tamanho do kit",
    options: ["10 unidades — até 2 modelos", "15 unidades — até 3 modelos", "20 unidades — até 4 modelos"],
    optionPrices: [35, 51, 66],
    optionDescriptions: [
      "Escolha até 2 modelos diferentes para o kit.",
      "Escolha até 3 modelos diferentes para o kit.",
      "Escolha até 4 modelos diferentes para o kit."
    ],
    customizationFields: PARTY_CUSTOMIZATION_FIELDS,
    customizationNotice: "Personalizados não acompanham guloseimas, apliques 3D ou laços.",
    details: [
      "Escolha entre milk, sushi, cone, meia bala, coração e caixa alta",
      "Pedido mínimo de 5 unidades de cada modelo",
      "Impresso em papel offset fosco 180 g",
      "Sem aplique 3D, laço ou guloseimas",
      "Kit 15 unidades: R$ 51 no Pix",
      "Kit 20 unidades: R$ 66 no Pix"
    ],
    note: "Valores no cartão e outras combinações estão no catálogo completo de festas."
  },
  {
    id: "kit-luxo",
    category: "festas",
    badge: "Com laço e 3D",
    meta: "Papelaria para festas",
    name: "Monte seu kit luxo",
    price: 50,
    priceLabel: "R$ 50",
    priceNote: "kit 10 un. no Pix",
    image: "assets/images/kit-luxo.jpg",
    alt: "Modelos e preços do kit luxo para festas",
    description: "Caixinhas com aplique 3D e laço, personalizadas no tema da sua comemoração.",
    optionLabel: "Tamanho do kit",
    options: ["10 unidades — até 2 modelos", "15 unidades — até 3 modelos", "20 unidades — até 4 modelos"],
    optionPrices: [50, 74, 98],
    optionDescriptions: [
      "Escolha até 2 modelos com aplique 3D e laço.",
      "Escolha até 3 modelos com aplique 3D e laço.",
      "Escolha até 4 modelos com aplique 3D e laço."
    ],
    customizationFields: PARTY_CUSTOMIZATION_FIELDS,
    customizationNotice: "Personalizados não acompanham guloseimas. Confirme o tema antes da produção.",
    details: [
      "Escolha entre milk, sushi, cone, meia bala, coração, caixa alta, canudo e maletinha",
      "Pedido mínimo de 5 unidades de cada modelo",
      "Impresso em papel offset fosco 180 g",
      "Inclui aplique 3D e laço",
      "Kit 15 unidades: R$ 74 no Pix",
      "Kit 20 unidades: R$ 98 no Pix"
    ],
    note: "Personalizados não acompanham guloseimas. Consulte os valores no cartão."
  },
  {
    id: "kit-caixinhas",
    category: "festas",
    badge: "Kit completo",
    meta: "Papelaria para festas",
    name: "Kit caixinhas clássicas",
    price: 65,
    priceLabel: "R$ 65",
    priceNote: "kit 1 no Pix",
    image: "assets/images/kit-caixinhas.jpg",
    alt: "Kits de caixinhas clássicas para festas",
    description: "Combinações prontas de caixinhas com topos de docinhos como brinde.",
    optionLabel: "Opção",
    options: ["Kit 1 — 20 itens + 10 brindes", "Kit 2 — 40 itens + 15 brindes", "Kit 3 — 60 itens + 24 brindes"],
    optionPrices: [65, 130, 190],
    optionDescriptions: [
      "20 caixinhas e 10 topos de docinhos como brinde.",
      "40 caixinhas e 15 topos de docinhos como brinde.",
      "60 caixinhas e 24 topos de docinhos como brinde."
    ],
    customizationFields: PARTY_CUSTOMIZATION_FIELDS,
    customizationNotice: "A composição dos kits é fixa e os personalizados não acompanham guloseimas.",
    details: [
      "Kit 1: 20 caixinhas e 10 topos de docinhos",
      "Kit 2: 40 caixinhas e 15 topos de docinhos",
      "Kit 3: 60 caixinhas e 24 topos de docinhos",
      "Impresso em papel offset fosco com alta qualidade",
      "Sem aplique 3D ou laços",
      "Os itens dos kits não podem ser alterados"
    ],
    note: "Personalizados não acompanham guloseimas. Consulte os valores no cartão."
  },
  {
    id: "adicionais",
    category: "acabamentos",
    badge: "A partir de R$ 5",
    meta: "Encadernação",
    name: "Adicionais para personalizar",
    price: 5,
    priceLabel: "R$ 5",
    priceNote: "a partir de",
    image: "assets/images/adicionais.jpeg",
    alt: "Lista de adicionais disponíveis para encadernações",
    description: "Pequenos detalhes para deixar agendas, cadernetas e planners ainda mais especiais.",
    optionLabel: "Adicional",
    options: ["Tassel ou pingente", "Bolso canguru", "Divisórias", "Wire-o", "Laminação holográfica", "Cartão do SUS", "Chaveiro", "Passante"],
    optionPrices: [5, 5, 8, 5, 10, 10, 5, 5],
    optionDescriptions: [
      "Pingente decorativo para combinar com o tema.",
      "Bolso plástico transparente para guardar documentos.",
      "Divisórias personalizadas com abas para organização.",
      "Encadernação em branco, rosa ou cobre, conforme disponibilidade.",
      "Efeito holográfico especial aplicado à capa.",
      "Cartão personalizado no mesmo tema do produto.",
      "Chaveiro polasseal personalizado para combinar.",
      "Passante metálico decorativo para o elástico."
    ],
    customizationFields: [
      {
        id: "targetProduct",
        label: "Em qual produto será aplicado?",
        type: "text",
        placeholder: "Ex.: reforma de caderneta, agenda ou planner",
        required: true
      },
      {
        id: "themeReference",
        label: "Tema ou referência",
        type: "text",
        placeholder: "Ex.: mesmo tema da caderneta",
        required: false
      },
      {
        id: "notes",
        label: "Observações ou preferência de cor",
        type: "textarea",
        placeholder: "Ex.: wire-o cobre ou tassel rosa",
        required: false
      }
    ],
    customizationNotice: "Cores e modelos dependem da disponibilidade no momento do pedido.",
    details: [
      "Tassel ou pingente: R$ 5",
      "Bolso canguru: R$ 5",
      "Divisórias personalizadas: R$ 8",
      "Wire-o em branco, rosa ou cobre: R$ 5",
      "Laminação holográfica: R$ 10",
      "Cartão do SUS no mesmo tema: R$ 10",
      "Chaveiro polasseal ou passante: R$ 5"
    ],
    note: "Consulte a disponibilidade das cores de wire-o."
  }
];

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

let selectedFilter = "todos";
let cart = loadCart();
let lastFocusedElement = null;
let customizationTrigger = null;
let editingCartIndex = null;
let toastTimer;

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
  sessionStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function getProduct(productId) {
  return products.find((product) => product.id === productId);
}

function getUnitPrice(product, option) {
  if (!product.optionPrices || !option) return product.price;
  const optionIndex = product.options.indexOf(option);
  return product.optionPrices[optionIndex] ?? product.price;
}

function renderProducts() {
  productGrid.innerHTML = products
    .map((product) => {
      const hidden = selectedFilter !== "todos" && product.category !== selectedFilter;
      return `
        <article class="product-card" data-product="${product.id}" data-category="${product.category}" ${hidden ? "hidden" : ""}>
          <div class="product-media">
            <img src="${product.image}" alt="${escapeHtml(product.alt)}" loading="lazy" />
            <span class="product-badge">${escapeHtml(product.badge)}</span>
          </div>
          <div class="product-body">
            <span class="product-meta">${escapeHtml(product.meta)}</span>
            <div class="product-title-row">
              <h3>${escapeHtml(product.name)}</h3>
              <span class="product-price">${escapeHtml(product.priceLabel)}<small>${escapeHtml(product.priceNote)}</small></span>
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

function renderCustomizationField(field, currentValue = "") {
  const requiredMark = field.required ? '<span aria-hidden="true">*</span>' : '<small>(opcional)</small>';
  const commonAttributes = `name="${escapeHtml(field.id)}" id="custom-${escapeHtml(field.id)}" ${field.required ? "required" : ""}`;

  let control;
  if (field.type === "textarea") {
    control = `<textarea ${commonAttributes} rows="3" maxlength="400" placeholder="${escapeHtml(field.placeholder || "")}">${escapeHtml(currentValue)}</textarea>`;
  } else if (field.type === "select") {
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
        type="${escapeHtml(field.type)}"
        value="${escapeHtml(currentValue)}"
        placeholder="${escapeHtml(field.placeholder || "")}"
        autocomplete="${getFieldAutocomplete(field.id)}"
        ${field.type === "tel" ? 'inputmode="tel" maxlength="20"' : 'maxlength="140"'}
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
  const itemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.querySelectorAll("[data-cart-count]").forEach((element) => {
    element.textContent = itemCount;
  });

  if (!cart.length) {
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
  cartContent.innerHTML = cart
    .map((item, index) => {
      const product = getProduct(item.productId);
      if (!product) return "";
      const unitPrice = getUnitPrice(product, item.option);
      const customizationDetails = getCustomizationDetails(product, item);
      total += unitPrice * item.quantity;
      return `
        <article class="cart-item">
          <img src="${product.image}" alt="" />
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

  productDialogContent.innerHTML = `
    <div class="product-dialog-layout">
      <div class="product-dialog-media">
        <img src="${product.image}" alt="${escapeHtml(product.alt)}" />
      </div>
      <div class="product-dialog-copy">
        <span class="eyebrow">${escapeHtml(product.meta)}</span>
        <h2>${escapeHtml(product.name)}</h2>
        <span class="dialog-price">${escapeHtml(product.priceLabel)} <small>${escapeHtml(product.priceNote)}</small></span>
        <p>${escapeHtml(product.description)}</p>
        <ul class="detail-list">
          ${product.details.map((detail) => `<li>${escapeHtml(detail)}</li>`).join("")}
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
  if (filterButton) {
    selectedFilter = filterButton.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((button) => {
      const isActive = button === filterButton;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
    document.querySelectorAll(".product-card").forEach((card) => {
      card.hidden = selectedFilter !== "todos" && card.dataset.category !== selectedFilter;
    });
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
