import assert from "node:assert/strict";
import { prepareProduct } from "../functions/_shared/product-repository.js";

const validProduct = {
  slug: "caderneta-personalizada",
  category: "cadernetas",
  name: "Caderneta personalizada",
  price: 70,
  image_url: "/media/catalogo/caderneta.webp",
  image_path: "catalogo/caderneta.webp",
  options: ["Brilhante"],
  option_prices: [70],
  option_descriptions: ["Acabamento brilhante"],
  customization_fields: [{ id: "nome", label: "Nome", type: "text", required: true }],
  details: ["Capa dura"]
};

const prepared = prepareProduct(validProduct);
assert.equal(prepared.slug, "caderneta-personalizada");
assert.equal(prepared.image_url, "/media/catalogo/caderneta.webp");
assert.deepEqual(JSON.parse(prepared.options), ["Brilhante"]);

assert.throws(
  () => prepareProduct({ ...validProduct, category: "categoria-inventada" }),
  /categoria válida/
);
assert.throws(
  () => prepareProduct({ ...validProduct, image_url: "https://example.com/foto.jpg", image_path: "" }),
  /enviada pelo painel/
);
assert.throws(
  () => prepareProduct({ ...validProduct, name: "x".repeat(101) }),
  /100 caracteres/
);

console.log("Repositório aprovado: validação, limites e vínculo de imagens com o R2.");
