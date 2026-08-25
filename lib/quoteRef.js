// Customer-facing quote reference, and the cookie that binds one quoting
// session together.
//
// Format: SYM-K4M7-92RT  (site code, then 8 random characters in two blocks)
//
// Deliberately random rather than sequential. A counter -- even one started at
// a high number -- leaks business volume (quote two references a week apart and
// you know the run rate) and lets anyone guess a neighbouring reference. Random
// does neither, and never looks like a new business.
//
// The alphabet drops 0/O, 1/I/L and U: the first two groups are the characters
// people misread over the phone, and dropping U means a reference can never
// spell something unfortunate.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
const BLOCK = 4;
const BLOCKS = 2;

export const QUOTE_REF_COOKIE = "sy_quote";
const MAX_AGE_SECONDS = 7 * 24 * 60 * 60;

const REF_PATTERN = new RegExp(`^[A-Z]{2,6}(-[${ALPHABET}]{${BLOCK}}){${BLOCKS}}$`);

// Rejection sampling: 256 is not a multiple of 30, so a plain `byte % 30` would
// make the first few characters of the alphabet slightly more likely.
function randomChars(count) {
  const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length;
  const out = [];
  while (out.length < count) {
    const bytes = new Uint8Array(count * 2);
    globalThis.crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < limit) {
        out.push(ALPHABET[b % ALPHABET.length]);
        if (out.length === count) break;
      }
    }
  }
  return out.join("");
}

export function newQuoteRef(prefix) {
  const code = String(prefix || "SY").toUpperCase().replace(/[^A-Z]/g, "").slice(0, 6) || "SY";
  const chars = randomChars(BLOCK * BLOCKS);
  const blocks = [];
  for (let i = 0; i < BLOCKS; i++) blocks.push(chars.slice(i * BLOCK, (i + 1) * BLOCK));
  return `${code}-${blocks.join("-")}`;
}

export function isValidQuoteRef(ref) {
  return typeof ref === "string" && REF_PATTERN.test(ref);
}

// Read the reference the browser is carrying. Anything that doesn't match the
// expected shape is discarded rather than trusted -- a caller can delete or
// tamper with this cookie, and the lead route treats a missing reference as
// something to flag, not something to accept silently.
export function readQuoteRef(request) {
  const ref = request.cookies?.get(QUOTE_REF_COOKIE)?.value;
  return isValidQuoteRef(ref) ? ref : null;
}

export function attachQuoteRef(response, ref) {
  response.cookies.set(QUOTE_REF_COOKIE, ref, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}
