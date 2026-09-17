/**
 * Host-page embed contract.
 *
 * The calculator boots only when a host page includes both:
 *   <div data-sym-calculator …></div>
 *   <script src="https://sym-calculator.vercel.app/embed.js" defer></script>
 *
 * Cloudflare WAF on epicdeals.co.za blocks saving inline <script> bodies
 * (see public/embed.js). The host must load embed.js via src. A mount
 * without that loader is a blank calculator — the 2026-09-17 /sell/ outage.
 *
 * WordPress for epicdeals.co.za is not in this repo. This module only
 * detects the break; restoring the snippet is a WP admin edit.
 */

export const EMBED_LOADER_NEEDLE = "sym-calculator.vercel.app/embed.js";
export const MOUNT_ATTR = "data-sym-calculator";
export const LEGACY_MOUNT_ID = "ed-calculator";

export const REQUIRED_HOSTS = [
  {
    name: "epicdeals /sell/",
    url: "https://epicdeals.co.za/sell/",
    requireMount: true,
    // Stored Gutenberg/HTML content. Used only for diagnostics: tells
    // operators whether the loader was stripped by cache/optimize, or
    // never saved in the page.
    wpJsonUrl:
      "https://epicdeals.co.za/wp-json/wp/v2/pages/736276?_fields=id,modified,link,content",
  },
];

const BLOCK_PAGE_RE =
  /cf-browser-verification|cf-challenge|cdn-cgi\/challenge|just a moment|attention required!|enable javascript and cookies to continue/i;

const REAL_PAGE_HINT_RE = /wp-content|data-sym-calculator|id=["']ed-calculator["']|Sell To Us/i;

export function stripHtmlComments(html) {
  return String(html).replace(/<!--[\s\S]*?-->/g, "");
}

export function pageHasMount(html) {
  const visible = stripHtmlComments(html);
  return (
    visible.includes(MOUNT_ATTR) ||
    new RegExp(`id=["']${LEGACY_MOUNT_ID}["']`).test(visible)
  );
}

export function pageHasLoader(html) {
  return stripHtmlComments(html).includes(EMBED_LOADER_NEEDLE);
}

export function htmlLooksBlocked(html, status) {
  if (pageHasMount(html) || pageHasLoader(html)) return false;
  if (typeof status === "number" && status >= 400) return true;
  const text = String(html);
  if (BLOCK_PAGE_RE.test(text)) return true;
  if (typeof status === "number" && status >= 200 && status < 400 && REAL_PAGE_HINT_RE.test(text)) {
    return false;
  }
  return false;
}

/**
 * @param {string} html
 * @param {{ requireMount?: boolean }} [opts]
 * @returns {{ ok: boolean, code: string, message: string, hasMount: boolean, hasLoader: boolean }}
 */
export function analyzeHostHtml(html, { requireMount = true } = {}) {
  const hasMount = pageHasMount(html);
  const hasLoader = pageHasLoader(html);

  if (hasMount && !hasLoader) {
    return {
      ok: false,
      code: "missing-loader",
      hasMount,
      hasLoader,
      message:
        `Found ${MOUNT_ATTR} without ${EMBED_LOADER_NEEDLE}. ` +
        "The mount is inert until the host page loads embed.js via src.",
    };
  }

  if (requireMount && !hasMount) {
    return {
      ok: false,
      code: "missing-mount",
      hasMount,
      hasLoader,
      message: `Expected ${MOUNT_ATTR} (or #${LEGACY_MOUNT_ID}) on this host page.`,
    };
  }

  return {
    ok: true,
    code: "ok",
    hasMount,
    hasLoader,
    message: "Host embed contract satisfied.",
  };
}

/**
 * Guard the documented contract in public/embed.js so a future edit cannot
 * silently drop the host-page usage snippet.
 *
 * @param {string} source
 */
export function analyzeEmbedContract(source) {
  const src = String(source);
  const issues = [];

  if (!src.includes("[data-sym-calculator]")) {
    issues.push("must query [data-sym-calculator] mounts");
  }
  if (!src.includes(`https://${EMBED_LOADER_NEEDLE}`)) {
    issues.push(`header must document <script src="https://${EMBED_LOADER_NEEDLE}">`);
  }
  if (!src.includes('data-site="epicdeals"')) {
    issues.push("header must document the epicdeals mount snippet");
  }
  if (!src.includes('var ORIGIN = "https://sym-calculator.vercel.app"')) {
    issues.push("must frame the calculator from https://sym-calculator.vercel.app");
  }
  if (!/Cloudflare|WAF/i.test(src)) {
    issues.push("must keep the Cloudflare WAF / no-inline-script rationale");
  }

  if (issues.length) {
    return {
      ok: false,
      code: "contract-drift",
      message: `embed.js is no longer the documented host-page contract: ${issues.join("; ")}`,
    };
  }

  return {
    ok: true,
    code: "ok",
    message: "embed.js still documents the host-page contract.",
  };
}

export function wpRenderedContent(payload) {
  if (!payload || typeof payload !== "object") return "";
  const content = payload.content;
  if (typeof content === "string") return content;
  if (content && typeof content.rendered === "string") return content.rendered;
  return "";
}
