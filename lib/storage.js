const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "calc-id-documents";

function requireConfig() {
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    throw new Error("Supabase Storage is not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)");
  }
}

function authHeaders() {
  return {
    Authorization: `Bearer ${SERVICE_ROLE}`,
    apikey: SERVICE_ROLE,
    "Content-Type": "application/json",
  };
}

export async function createSignedUploadUrl(path) {
  requireConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/upload/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({}),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Could not create signed upload URL: ${res.status} ${text}`);
  }
  const data = await res.json();
  return { uploadUrl: `${SUPABASE_URL}/storage/v1${data.url}`, path };
}

export async function createSignedReadUrl(path, expiresIn = 300) {
  requireConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ expiresIn }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Could not create signed read URL: ${res.status} ${text}`);
  }
  const data = await res.json();
  return `${SUPABASE_URL}/storage/v1${data.signedURL}`;
}

export async function downloadStoredObject(path) {
  requireConfig();
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${path}`, {
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Could not download ${path}: ${res.status} ${text}`);
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  return {
    filename: String(path).split("/").pop() || "photo.jpg",
    content: buffer.toString("base64"),
  };
}
