import assert from "node:assert/strict";

import { getAnalyticsSummary, recordTelemetryEvent } from "../functions/_shared/analytics-repository.js";
import { deleteImageQuietly, isPendingImagePath, promotePendingImage } from "../functions/_shared/image-storage.js";

function telemetryDatabase(publishedSlugs = ["produto-teste"]) {
  const writes = [];
  return {
    writes,
    prepare(sql) {
      return {
        bind(...args) {
          return {
            sql,
            args,
            async all() {
              if (sql.includes("SELECT slug FROM products")) {
                return { results: publishedSlugs.filter((slug) => args.includes(slug)).map((slug) => ({ slug })) };
              }
              if (sql.includes("product_slug = ''")) {
                return { results: [{ event_name: "catalog_view", total: 20 }, { event_name: "whatsapp_click", total: 3 }] };
              }
              return {
                results: [{
                  product_slug: "produto-teste",
                  product_name: "Produto de teste",
                  product_views: 12,
                  cart_adds: 6,
                  whatsapp_clicks: 3
                }]
              };
            }
          };
        }
      };
    },
    async batch(statements) {
      writes.push(...statements);
      return statements.map(() => ({ success: true }));
    }
  };
}

const db = telemetryDatabase();
const recorded = await recordTelemetryEvent(
  db,
  { eventName: "product_view", productSlugs: ["produto-teste"] },
  new Date("2026-08-25T12:00:00Z")
);
assert.deepEqual(recorded, {
  eventDate: "2026-08-25",
  eventName: "product_view",
  productSlugs: ["produto-teste"]
});
assert.equal(db.writes.length, 2, "O evento deve atualizar o total geral e o total do produto.");
assert.deepEqual(db.writes.map((statement) => statement.args.slice(1)), [
  ["product_view", ""],
  ["product_view", "produto-teste"]
]);

await assert.rejects(
  recordTelemetryEvent(db, { eventName: "customer_name", productSlugs: [] }),
  /Evento de telemetria inválido/
);
await assert.rejects(
  recordTelemetryEvent(telemetryDatabase([]), { eventName: "cart_add", productSlugs: ["produto-oculto"] }),
  /produto indisponível/
);

const summary = await getAnalyticsSummary(db, 30, new Date("2026-08-25T12:00:00Z"));
assert.equal(summary.totals.catalog_view, 20);
assert.equal(summary.totals.product_view, 0);
assert.equal(summary.products[0].whatsappClicks, 3);
assert.equal(summary.startDate, "2026-07-27");

const bucketOperations = [];
const bucket = {
  async get(path) {
    assert.equal(path, "pending/foto.webp");
    return {
      body: new Uint8Array([1, 2, 3]),
      httpMetadata: { contentType: "image/webp" },
      customMetadata: { originalName: "foto.webp" }
    };
  },
  async put(path, body, metadata) {
    bucketOperations.push({ type: "put", path, body, metadata });
  },
  async delete(path) {
    bucketOperations.push({ type: "delete", path });
  }
};

assert.equal(isPendingImagePath("pending/foto.webp"), true);
assert.equal(isPendingImagePath("catalogo/foto.webp"), false);
const promoted = await promotePendingImage(bucket, "pending/foto.webp");
assert.match(promoted.permanentPath, /^catalogo\/\d+-[0-9a-f-]+\.webp$/);
assert.equal(promoted.publicUrl, `/media/${promoted.permanentPath}`);
assert.equal(bucketOperations[0].metadata.httpMetadata.contentType, "image/webp");
await deleteImageQuietly(bucket, promoted.pendingPath);
assert.deepEqual(bucketOperations.at(-1), { type: "delete", path: "pending/foto.webp" });

await deleteImageQuietly({ delete: async () => { throw new Error("falha simulada"); } }, "catalogo/foto.webp");

console.log("Infraestrutura aprovada: promoção no R2 e telemetria agregada no D1.");
