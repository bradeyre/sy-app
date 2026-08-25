// Best-effort in-memory rate limit. Serverless instances are ephemeral and
// can scale to N copies, so this is not a hard guarantee -- it's a cheap
// first line of defense that costs nothing to run. Combine with the
// honeypot + minimum-fill-time checks in the lead route for real coverage.
const hits = new Map();
const WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_PER_WINDOW = 5;

export function isRateLimited(key, { max = MAX_PER_WINDOW, windowMs = WINDOW_MS } = {}) {
  const now = Date.now();
  const entry = hits.get(key) || [];
  const recent = entry.filter((t) => now - t < windowMs);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}
