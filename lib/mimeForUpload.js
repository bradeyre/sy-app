// Signed Supabase uploads to calc-id-documents reject application/octet-stream
// (HTTP 415). Mobile browsers often leave File.type empty; never send a generic
// MIME to the signed URL.

export const ALLOWED_UPLOAD_EXT = new Set(["jpg", "jpeg", "png", "heic", "pdf"]);

export const ALLOWED_UPLOAD_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/heic",
  "application/pdf",
]);

const EXT_TO_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  heic: "image/heic",
  pdf: "application/pdf",
};

function normalizeMime(value) {
  return String(value || "")
    .toLowerCase()
    .split(";")[0]
    .trim();
}

function extFromName(name) {
  const raw = String(name || "").split(".").pop() || "";
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function mimeForUpload(file) {
  const type = normalizeMime(file?.type);
  if (ALLOWED_UPLOAD_MIME.has(type)) return type;
  const mapped = EXT_TO_MIME[extFromName(file?.name)];
  return mapped || "image/jpeg";
}

export function extForUpload(file) {
  const ext = extFromName(file?.name);
  return ALLOWED_UPLOAD_EXT.has(ext) ? ext : "jpg";
}
