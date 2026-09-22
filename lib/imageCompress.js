/**
 * Client-side image compress for calculator uploads.
 * Target: ≤ 1MB JPEG. HEIC/HEIF cannot be drawn to canvas in most
 * browsers — those return a WhatsApp-convert hint instead.
 */

export const IMAGE_MAX_BYTES = 1024 * 1024;

export function isHeicFile(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();
  return type.includes("heic") || type.includes("heif") || /\.hei[cf]$/.test(name);
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

/**
 * @param {File} file
 * @returns {Promise<{ ok: boolean, file?: File, reason?: string, compressed?: boolean }>}
 */
export async function compressImageTo1MB(file) {
  if (!file) return { ok: false, reason: "missing" };
  if (isHeicFile(file)) return { ok: false, reason: "heic" };
  if (!String(file.type || "").startsWith("image/")) {
    return { ok: false, reason: "not_image" };
  }
  if (file.size <= IMAGE_MAX_BYTES && /jpe?g$/i.test(file.type || file.name)) {
    return { ok: true, file, compressed: false };
  }

  if (typeof createImageBitmap !== "function" || typeof document === "undefined") {
    if (file.size <= IMAGE_MAX_BYTES) return { ok: true, file, compressed: false };
    return { ok: false, reason: "too_large" };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return { ok: false, reason: "decode" };
  }

  const maxEdge = 2000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return { ok: false, reason: "canvas" };
  ctx.drawImage(bitmap, 0, 0, width, height);
  if (bitmap.close) bitmap.close();

  let quality = 0.82;
  let blob = await canvasToBlob(canvas, "image/jpeg", quality);
  while (blob && blob.size > IMAGE_MAX_BYTES && quality > 0.45) {
    quality -= 0.12;
    blob = await canvasToBlob(canvas, "image/jpeg", quality);
  }

  if (!blob) return { ok: false, reason: "encode" };
  if (blob.size > IMAGE_MAX_BYTES) return { ok: false, reason: "too_large" };

  const next = new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", {
    type: "image/jpeg",
  });
  return { ok: true, file: next, compressed: true };
}
