// Vercel-aware client IP extraction. A bare `x-forwarded-for` header is
// client-supplied and trivially spoofable (anyone can send their own value
// for it), which defeats IP-based rate limiting. Vercel's edge network sets
// `x-vercel-forwarded-for` itself, overwriting anything the client sent, so
// that one is trustworthy. Fall back to `x-real-ip`, then to the last hop of
// `x-forwarded-for` (the entry closest to us, hardest for a client to forge),
// then "unknown".
export function getClientIp(request) {
  const vercelFwd = request.headers.get("x-vercel-forwarded-for");
  if (vercelFwd) return vercelFwd.split(",")[0].trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    const parts = fwd.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length) return parts[parts.length - 1];
  }
  return "unknown";
}
