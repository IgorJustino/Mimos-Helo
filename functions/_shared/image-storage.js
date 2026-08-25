const PENDING_PREFIX = "pending/";
const PERMANENT_PREFIX = "catalogo/";

function storageError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

export function isPendingImagePath(path) {
  return typeof path === "string" && path.startsWith(PENDING_PREFIX);
}

export async function promotePendingImage(bucket, pendingPath) {
  if (!isPendingImagePath(pendingPath)) return null;

  const source = await bucket.get(pendingPath);
  if (!source?.body) throw storageError("A foto temporária expirou. Escolha a imagem novamente.", 410);

  const extension = pendingPath.split(".").at(-1)?.toLowerCase();
  if (!extension || !["jpg", "png", "webp"].includes(extension)) {
    throw storageError("O formato da foto temporária é inválido.");
  }

  const permanentPath = `${PERMANENT_PREFIX}${Date.now()}-${crypto.randomUUID()}.${extension}`;
  await bucket.put(permanentPath, source.body, {
    httpMetadata: source.httpMetadata,
    customMetadata: source.customMetadata
  });

  return {
    pendingPath,
    permanentPath,
    publicUrl: `/media/${permanentPath}`
  };
}

export async function deleteImageQuietly(bucket, path) {
  if (!path) return;
  try {
    await bucket.delete(path);
  } catch {
    // Limpeza compensatória: a operação principal não deve falhar por isso.
  }
}
