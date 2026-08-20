(function initializeAdmin() {
  "use strict";

  const catalog = window.MimosCatalog;
  const views = {
    loading: document.querySelector("[data-admin-loading]"),
    setup: document.querySelector("[data-admin-setup]"),
    login: document.querySelector("[data-admin-login]"),
    denied: document.querySelector("[data-admin-denied]"),
    workspace: document.querySelector("[data-admin-workspace]")
  };
  const account = document.querySelector("[data-admin-account]");
  const adminEmail = document.querySelector("[data-admin-email]");
  const loginForm = document.querySelector("[data-login-form]");
  const loginMessage = document.querySelector("[data-login-message]");
  const productList = document.querySelector("[data-admin-product-list]");
  const searchInput = document.querySelector("[data-product-search]");
  const editorEmpty = document.querySelector("[data-editor-empty]");
  const productForm = document.querySelector("[data-product-form]");
  const editorTitle = document.querySelector("[data-editor-title]");
  const editorKicker = document.querySelector("[data-editor-kicker]");
  const deleteButton = document.querySelector("[data-delete-product]");
  const optionsList = document.querySelector("[data-options-list]");
  const optionsEmpty = document.querySelector("[data-options-empty]");
  const fieldsList = document.querySelector("[data-fields-list]");
  const fieldsEmpty = document.querySelector("[data-fields-empty]");
  const imagePreview = document.querySelector("[data-image-preview]");
  const imageFileInput = productForm.querySelector('[name="imageFile"]');
  const toast = document.querySelector("[data-admin-toast]");
  const saveStatus = document.querySelector("[data-save-status]");

  const state = {
    products: [],
    selectedId: null,
    currentUser: null,
    previewUrl: "",
    toastTimer: null
  };
  const MAX_SOURCE_IMAGE_SIZE = 20 * 1024 * 1024;
  const MAX_UPLOADED_IMAGE_SIZE = 5 * 1024 * 1024;
  const MAX_IMAGE_DIMENSION = 1800;

  function showView(name) {
    Object.entries(views).forEach(([viewName, element]) => {
      element.hidden = viewName !== name;
    });
    account.hidden = name !== "workspace";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(Number(value || 0));
  }

  function slugify(value) {
    return String(value || "produto")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "produto";
  }

  function uniqueSlug(name, currentId = null) {
    const base = slugify(name);
    const used = new Set(state.products.filter((product) => product.id !== currentId).map((product) => product.slug));
    if (!used.has(base)) return base;
    let suffix = 2;
    while (used.has(`${base}-${suffix}`)) suffix += 1;
    return `${base}-${suffix}`;
  }

  function showToast(message) {
    window.clearTimeout(state.toastTimer);
    toast.textContent = message;
    toast.classList.add("is-visible");
    state.toastTimer = window.setTimeout(() => toast.classList.remove("is-visible"), 3200);
  }

  function humanizeError(error) {
    const message = String(error?.message || error || "");
    if (/usuário ou senha|credenciais inválidas/i.test(message)) return "Usuário ou senha incorretos.";
    if (/sessão|não autorizado|unauthorized|forbidden/i.test(message)) return "Sua sessão expirou. Entre novamente.";
    if (/muitas tentativas/i.test(message)) return message;
    if (/unique constraint|products.slug|constraint failed/i.test(message)) return "Já existe um produto com esse nome. Altere o nome e tente novamente.";
    if (/r2|binding.*images|espaço de imagens/i.test(message)) return "O espaço de imagens R2 ainda não foi conectado na Cloudflare.";
    if (/d1|binding.*db|no such table/i.test(message)) return "O banco D1 ainda não foi configurado completamente.";
    if (/failed to fetch|network/i.test(message)) return "Não foi possível conectar. Verifique a internet e tente novamente.";
    return "Não foi possível concluir esta ação. Tente novamente.";
  }

  function setBusy(buttons, busy, label = "Salvando…") {
    buttons.forEach((button) => {
      if (!button.dataset.originalLabel) button.dataset.originalLabel = button.textContent.trim();
      button.disabled = busy;
      button.textContent = busy ? label : button.dataset.originalLabel;
    });
  }

  function setFormDirty(dirty) {
    productForm.dataset.dirty = String(dirty);
    saveStatus.textContent = dirty ? "Há alterações que ainda não foram salvas." : "Todas as alterações estão salvas.";
  }

  function canLeaveEditor() {
    return productForm.dataset.dirty !== "true" || window.confirm("Descartar as alterações que ainda não foram salvas?");
  }

  function renderImagePreview(source, alt = "") {
    if (!source) {
      imagePreview.innerHTML = '<span aria-hidden="true">+</span><p>A foto aparecerá aqui</p>';
      return;
    }
    imagePreview.innerHTML = `<img src="${escapeHtml(source)}" alt="${escapeHtml(alt)}" />`;
  }

  function canvasToBlob(canvas, type, quality) {
    return new Promise((resolve, reject) => {
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("Não foi possível otimizar esta imagem."))),
        type,
        quality
      );
    });
  }

  async function decodeProductImage(file) {
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
      } catch {
        // Older browsers fall back to a regular image element below.
      }
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.decoding = "async";
    image.src = objectUrl;
    try {
      await image.decode();
      return {
        source: image,
        width: image.naturalWidth,
        height: image.naturalHeight,
        close: () => URL.revokeObjectURL(objectUrl)
      };
    } catch {
      URL.revokeObjectURL(objectUrl);
      throw new Error("Não foi possível abrir esta imagem.");
    }
  }

  async function compressProductImage(file) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      throw new Error("Use uma imagem JPG, PNG ou WebP.");
    }
    if (file.size > MAX_SOURCE_IMAGE_SIZE) {
      throw new Error("A imagem original deve ter no máximo 20 MB.");
    }

    const decoded = await decodeProductImage(file);
    try {
      const initialScale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(decoded.width, decoded.height));
      let width = Math.max(1, Math.round(decoded.width * initialScale));
      let height = Math.max(1, Math.round(decoded.height * initialScale));
      let quality = 0.84;
      let optimized;

      for (let attempt = 0; attempt < 4; attempt += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Seu navegador não conseguiu preparar a imagem.");
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = "high";
        context.drawImage(decoded.source, 0, 0, width, height);
        optimized = await canvasToBlob(canvas, "image/webp", quality);
        if (optimized.size <= MAX_UPLOADED_IMAGE_SIZE) break;
        width = Math.max(1, Math.round(width * 0.8));
        height = Math.max(1, Math.round(height * 0.8));
        quality = Math.max(0.62, quality - 0.08);
      }

      if (!optimized || optimized.size > MAX_UPLOADED_IMAGE_SIZE) {
        throw new Error("Não foi possível reduzir a imagem para menos de 5 MB.");
      }
      if (file.size <= MAX_UPLOADED_IMAGE_SIZE && optimized.size >= file.size) return file;

      const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-z0-9_-]+/gi, "-") || "produto";
      return new File([optimized], `${baseName}.webp`, {
        type: "image/webp",
        lastModified: Date.now()
      });
    } finally {
      decoded.close();
    }
  }

  function updateRepeaterStates() {
    optionsEmpty.hidden = Boolean(optionsList.children.length);
    fieldsEmpty.hidden = Boolean(fieldsList.children.length);
  }

  function addOptionRow(option = {}) {
    const row = document.createElement("div");
    row.className = "repeater-row option-row";
    row.innerHTML = `
      <label class="mini-field">
        <span>Nome da opção *</span>
        <input data-option-name required maxlength="100" value="${escapeHtml(option.name || "")}" placeholder="Ex.: Tamanho M" />
      </label>
      <label class="mini-field">
        <span>Preço</span>
        <input data-option-price type="number" min="0" step="0.01" inputmode="decimal" value="${option.price ?? ""}" placeholder="Opcional" />
      </label>
      <label class="mini-field">
        <span>Explicação</span>
        <input data-option-description maxlength="180" value="${escapeHtml(option.description || "")}" placeholder="O que muda nesta opção?" />
      </label>
      <button class="remove-row" type="button" data-remove-row aria-label="Remover opção">×</button>
    `;
    optionsList.append(row);
    updateRepeaterStates();
    row.querySelector("input")?.focus();
  }

  function updateFieldChoices(row) {
    const type = row.querySelector("[data-field-type]").value;
    const choicesInput = row.querySelector("[data-field-choices]");
    const choices = choicesInput.closest("label");
    choices.hidden = type !== "select";
    choicesInput.disabled = type !== "select";
    choicesInput.required = type === "select";
  }

  function addFieldRow(field = {}) {
    const row = document.createElement("div");
    row.className = "repeater-row field-row";
    row.dataset.fieldId = field.id || "";
    const choices = Array.isArray(field.options) ? field.options.join(", ") : "";
    row.innerHTML = `
      <label class="mini-field">
        <span>Pergunta *</span>
        <input data-field-label required maxlength="100" value="${escapeHtml(field.label || "")}" placeholder="Ex.: Nome para a capa" />
      </label>
      <label class="mini-field">
        <span>Tipo</span>
        <select data-field-type>
          <option value="text" ${field.type === "text" || !field.type ? "selected" : ""}>Texto curto</option>
          <option value="textarea" ${field.type === "textarea" ? "selected" : ""}>Texto longo</option>
          <option value="select" ${field.type === "select" ? "selected" : ""}>Lista de escolhas</option>
          <option value="number" ${field.type === "number" ? "selected" : ""}>Número</option>
          <option value="date" ${field.type === "date" ? "selected" : ""}>Data</option>
          <option value="tel" ${field.type === "tel" ? "selected" : ""}>Telefone</option>
        </select>
      </label>
      <label class="mini-field">
        <span>Exemplo</span>
        <input data-field-placeholder maxlength="160" value="${escapeHtml(field.placeholder || "")}" placeholder="Texto de ajuda" />
      </label>
      <label class="mini-field">
        <span>Escolhas separadas por vírgula</span>
        <input data-field-choices maxlength="400" value="${escapeHtml(choices)}" placeholder="P, M, G" />
      </label>
      <label class="mini-check">
        <input data-field-required type="checkbox" ${field.required ? "checked" : ""} /> Obrigatório
      </label>
      <button class="remove-row" type="button" data-remove-row aria-label="Remover campo">×</button>
    `;
    fieldsList.append(row);
    updateFieldChoices(row);
    updateRepeaterStates();
    row.querySelector("input")?.focus();
  }

  function renderProductList() {
    const query = searchInput.value.trim().toLocaleLowerCase("pt-BR");
    const visibleProducts = state.products.filter((product) => {
      const text = `${product.name} ${product.category} ${product.meta}`.toLocaleLowerCase("pt-BR");
      return text.includes(query);
    });

    document.querySelector("[data-product-total]").textContent = state.products.length;
    document.querySelector("[data-published-total]").textContent = state.products.filter((product) => product.published).length;
    document.querySelector("[data-draft-total]").textContent = state.products.filter((product) => !product.published).length;

    if (!visibleProducts.length) {
      productList.innerHTML = `<p class="rail-empty">${state.products.length ? "Nenhum produto encontrado." : "Cadastre seu primeiro produto para começar."}</p>`;
      return;
    }

    productList.innerHTML = visibleProducts
      .map(
        (product) => `
          <button class="admin-product-card ${product.id === state.selectedId ? "is-active" : ""}" type="button" data-edit-product="${escapeHtml(product.id)}">
            ${
              product.image
                ? `<img src="${escapeHtml(product.image)}" alt="" />`
                : '<span class="admin-product-placeholder" aria-hidden="true">♡</span>'
            }
            <span class="admin-product-copy">
              <strong>${escapeHtml(product.name)}</strong>
              <small>${formatCurrency(product.price)} · ${escapeHtml(product.category)}</small>
            </span>
            <span class="product-status-dot ${product.published ? "" : "is-draft"}" title="${product.published ? "Publicado" : "Oculto"}"></span>
          </button>
        `
      )
      .join("");
  }

  function clearRepeaters() {
    optionsList.innerHTML = "";
    fieldsList.innerHTML = "";
    updateRepeaterStates();
  }

  function openProductEditor(product = null) {
    if (!canLeaveEditor()) return;
    state.selectedId = product?.id || null;
    productForm.reset();
    clearRepeaters();
    productForm.hidden = false;
    editorEmpty.hidden = true;
    deleteButton.hidden = !product;

    const values = product || {
      category: "cadernetas",
      published: true,
      sortOrder: (Math.max(0, ...state.products.map((item) => item.sortOrder || 0)) || 0) + 10,
      optionLabel: "Opção",
      options: [],
      optionPrices: [],
      optionDescriptions: [],
      customizationFields: [],
      details: []
    };

    const fields = productForm.elements;
    fields.id.value = values.id || "";
    fields.imagePath.value = values.imagePath || "";
    fields.name.value = values.name || "";
    fields.shortName.value = values.shortName || "";
    fields.category.value = values.category || "outros";
    fields.price.value = values.price ?? "";
    fields.priceNote.value = values.priceNote || "";
    fields.badge.value = values.badge || "";
    fields.meta.value = values.meta || "";
    fields.description.value = values.description || "";
    fields.sortOrder.value = values.sortOrder ?? 0;
    fields.published.checked = values.published !== false;
    fields.image.value = values.image || "";
    fields.alt.value = values.alt || "";
    fields.optionLabel.value = values.optionLabel || "Opção";
    fields.customizationNotice.value = values.customizationNotice || "";
    fields.details.value = (values.details || []).join("\n");
    fields.note.value = values.note || "";

    (values.options || []).forEach((name, index) => {
      addOptionRow({
        name,
        price: values.optionPrices?.[index] ?? "",
        description: values.optionDescriptions?.[index] || ""
      });
    });
    (values.customizationFields || []).forEach(addFieldRow);

    editorKicker.textContent = product ? (product.published ? "Produto publicado" : "Produto oculto") : "Novo produto";
    editorTitle.textContent = product?.name || "Cadastre um produto";
    renderImagePreview(values.image, values.alt);
    renderProductList();
    setFormDirty(false);

    if (window.innerWidth <= 780) {
      document.querySelector(".product-editor").scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  function collectOptions() {
    const rows = [...optionsList.querySelectorAll(".option-row")];
    return rows.map((row) => {
      const priceValue = row.querySelector("[data-option-price]").value;
      return {
        name: row.querySelector("[data-option-name]").value.trim(),
        price: priceValue === "" ? null : Number(priceValue),
        description: row.querySelector("[data-option-description]").value.trim()
      };
    });
  }

  function collectCustomizationFields() {
    const usedIds = new Set();
    return [...fieldsList.querySelectorAll(".field-row")].map((row, index) => {
      const label = row.querySelector("[data-field-label]").value.trim();
      let id = row.dataset.fieldId || slugify(label);
      if (usedIds.has(id)) id = `${id}-${index + 1}`;
      usedIds.add(id);
      const type = row.querySelector("[data-field-type]").value;
      const field = {
        id,
        label,
        type,
        placeholder: row.querySelector("[data-field-placeholder]").value.trim(),
        required: row.querySelector("[data-field-required]").checked
      };
      if (type === "select") {
        field.options = row
          .querySelector("[data-field-choices]")
          .value.split(",")
          .map((choice) => choice.trim())
          .filter(Boolean);
      }
      return field;
    });
  }

  async function saveCurrentProduct(event) {
    event.preventDefault();
    if (!productForm.reportValidity()) return;

    const saveButtons = [...document.querySelectorAll("[data-save-product]")];
    setBusy(saveButtons, true);
    saveStatus.textContent = "Salvando produto…";

    try {
      const fields = productForm.elements;
      let image = fields.image.value;
      let imagePath = fields.imagePath.value;
      const imageFile = imageFileInput.files[0];

      if (imageFile) {
        saveStatus.textContent = "Otimizando a imagem…";
        const optimizedImage = await compressProductImage(imageFile);
        saveStatus.textContent = "Enviando a imagem otimizada…";
        const uploaded = await catalog.uploadProductImage(optimizedImage);
        image = uploaded.publicUrl;
        imagePath = uploaded.path;
      }

      if (!image) throw new Error("Escolha uma foto para o produto.");

      const currentProduct = state.products.find((product) => product.id === state.selectedId);
      const optionItems = collectOptions();
      const product = {
        id: fields.id.value || undefined,
        slug: currentProduct?.slug || uniqueSlug(fields.name.value, fields.id.value || null),
        name: fields.name.value.trim(),
        shortName: fields.shortName.value.trim(),
        category: fields.category.value,
        price: Number(fields.price.value),
        priceNote: fields.priceNote.value.trim(),
        badge: fields.badge.value.trim(),
        meta: fields.meta.value.trim(),
        description: fields.description.value.trim(),
        sortOrder: Number(fields.sortOrder.value || 0),
        published: fields.published.checked,
        image,
        imagePath,
        alt: fields.alt.value.trim() || `Foto de ${fields.name.value.trim()}`,
        optionLabel: fields.optionLabel.value.trim() || "Opção",
        options: optionItems.map((item) => item.name),
        optionPrices: optionItems.map((item) => item.price),
        optionDescriptions: optionItems.map((item) => item.description),
        customizationFields: collectCustomizationFields(),
        customizationNotice: fields.customizationNotice.value.trim(),
        details: fields.details.value.split("\n").map((line) => line.trim()).filter(Boolean),
        note: fields.note.value.trim()
      };

      const savedProduct = await catalog.saveProduct(product);
      const existingIndex = state.products.findIndex((item) => item.id === savedProduct.id);
      if (existingIndex >= 0) state.products[existingIndex] = savedProduct;
      else state.products.push(savedProduct);
      state.products.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, "pt-BR"));
      state.selectedId = savedProduct.id;
      imageFileInput.value = "";
      showToast(`${savedProduct.name} foi salvo e o catálogo já está atualizado.`);
      setFormDirty(false);
      openProductEditor(savedProduct);
    } catch (error) {
      saveStatus.textContent = humanizeError(error);
      showToast(error.message && error.message.length < 90 ? error.message : humanizeError(error));
    } finally {
      setBusy(saveButtons, false);
    }
  }

  async function removeCurrentProduct() {
    const product = state.products.find((item) => item.id === state.selectedId);
    if (!product) return;
    if (!window.confirm(`Excluir “${product.name}” definitivamente?`)) return;

    deleteButton.disabled = true;
    try {
      await catalog.deleteProduct(product.id);
      state.products = state.products.filter((item) => item.id !== product.id);
      state.selectedId = null;
      productForm.hidden = true;
      editorEmpty.hidden = false;
      renderProductList();
      showToast(`${product.name} foi excluído.`);
    } catch (error) {
      showToast(humanizeError(error));
    } finally {
      deleteButton.disabled = false;
    }
  }

  async function loadWorkspace(user) {
    const authorized = await catalog.verifyAdmin(user.id);
    if (!authorized) {
      showView("denied");
      return;
    }

    state.currentUser = user;
    adminEmail.textContent = user.email || "Administradora";
    showView("workspace");

    try {
      state.products = await catalog.listAllProducts();
      renderProductList();
      if (state.products.length) openProductEditor(state.products[0]);
    } catch (error) {
      showToast(humanizeError(error));
    }
  }

  async function handleLogin(event) {
    event.preventDefault();
    loginMessage.textContent = "";
    const submitButton = document.querySelector("[data-login-submit]");
    setBusy([submitButton], true, "Entrando…");
    try {
      const formData = new FormData(loginForm);
      const { user } = await catalog.signIn(
        String(formData.get("username") || "").trim(),
        String(formData.get("password") || "")
      );
      await loadWorkspace(user);
      loginForm.reset();
    } catch (error) {
      loginMessage.textContent = error?.message || humanizeError(error);
    } finally {
      setBusy([submitButton], false);
    }
  }

  async function handleSignOut() {
    await catalog.signOut();
    state.currentUser = null;
    state.products = [];
    state.selectedId = null;
    productForm.hidden = true;
    editorEmpty.hidden = false;
    showView("login");
  }

  async function boot() {
    try {
      const config = await catalog.loadConfiguration();
      if (!config.configured) {
        showView("setup");
        return;
      }

      const user = await catalog.getCurrentUser();
      if (!user) {
        showView("login");
        return;
      }
      await loadWorkspace(user);
    } catch (error) {
      showView("login");
      loginMessage.textContent = humanizeError(error);
    }
  }

  loginForm.addEventListener("submit", handleLogin);
  document.querySelectorAll("[data-admin-signout]").forEach((button) => button.addEventListener("click", handleSignOut));
  document.querySelectorAll("[data-new-product]").forEach((button) => {
    button.addEventListener("click", () => openProductEditor());
  });
  searchInput.addEventListener("input", renderProductList);
  productList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-product]");
    if (!button) return;
    const product = state.products.find((item) => item.id === button.dataset.editProduct);
    if (product) openProductEditor(product);
  });
  document.querySelector("[data-add-option]").addEventListener("click", () => addOptionRow());
  document.querySelector("[data-add-field]").addEventListener("click", () => addFieldRow());
  productForm.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove-row]");
    if (!removeButton) return;
    removeButton.closest(".repeater-row")?.remove();
    updateRepeaterStates();
    setFormDirty(true);
  });
  productForm.addEventListener("change", (event) => {
    if (event.target.matches("[data-field-type]")) updateFieldChoices(event.target.closest(".field-row"));
    if (event.target === imageFileInput && imageFileInput.files[0]) {
      if (state.previewUrl) URL.revokeObjectURL(state.previewUrl);
      state.previewUrl = URL.createObjectURL(imageFileInput.files[0]);
      renderImagePreview(state.previewUrl, productForm.elements.alt.value);
    }
    setFormDirty(true);
  });
  productForm.addEventListener("input", (event) => {
    if (event.target.name === "name") editorTitle.textContent = event.target.value.trim() || "Cadastre um produto";
    setFormDirty(true);
  });
  productForm.addEventListener("submit", saveCurrentProduct);
  deleteButton.addEventListener("click", removeCurrentProduct);
  window.addEventListener("beforeunload", (event) => {
    if (productForm.dataset.dirty !== "true") return;
    event.preventDefault();
  });

  updateRepeaterStates();
  boot();
})();
