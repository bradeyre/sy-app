import localFont from "next/font/local";
import { headers } from "next/headers";
import { getSiteConfig } from "@/lib/siteConfig";
import "./globals.css";

export const dynamic = "force-dynamic";

/**
 * The same face every storefront runs, self-hosted from the same five
 * weights, so the frame does not announce itself with a different typeface
 * the moment it loads inside one of them.
 */
const satoshi = localFont({
  src: [
    { path: "../public/fonts/satoshi/Satoshi-300.woff2", weight: "300", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-400.woff2", weight: "400", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-500.woff2", weight: "500", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-700.woff2", weight: "700", style: "normal" },
    { path: "../public/fonts/satoshi/Satoshi-900.woff2", weight: "900", style: "normal" },
  ],
  variable: "--font-satoshi",
  display: "swap",
});

/**
 * Tenants whose accent this stylesheet actually varies. Everything else
 * runs the group blue, which is the base value in globals.css, so this list
 * stays deliberately short rather than enumerating every storefront.
 *
 * Kept in sync by hand with the `[data-site=...]` blocks in globals.css. A
 * key here with no matching block (or the reverse) is simply a no-op, not a
 * break -- the site falls back to the group blue.
 */
const THEMED_SITES = ["sellyourmac", "epicdeals"];

/**
 * Corrects `data-site` from `?site=` before first paint.
 *
 * The server can only resolve the tenant from the Host header, and the
 * niche sites all frame this app from `sym-calculator.vercel.app` with the
 * tenant in the query string instead -- so on every embedded view the
 * server's guess is the default tenant, not the real one. Running this
 * inline in <head> means the accent is correct on the first frame rather
 * than flipping colour once React hydrates.
 *
 * Also applies the embedding site's theme -- see the notes in the script.
 */
const SITE_ATTR_SCRIPT = `
(function () {
  var root = document.documentElement;
  try {
    var q = new URLSearchParams(location.search);
    var k = q.get("site");
    if (k && ${JSON.stringify(THEMED_SITES)}.indexOf(k) !== -1) {
      root.setAttribute("data-site", k);
    } else if (k) {
      root.removeAttribute("data-site");
    }

    // The embedding page resolves its own theme from a toggle this frame
    // cannot see, so it passes the answer twice: once in the URL, which
    // lands before first paint and avoids a flash, and again by
    // postMessage whenever the visitor flips it. Absent both, the CSS
    // falls back to prefers-color-scheme, which is right for anyone who
    // has never touched a toggle.
    var t = q.get("theme");
    if (t === "light" || t === "dark") root.setAttribute("data-theme", t);

    // Accept the theme only from the page actually embedding this frame,
    // rather than from a list of storefront origins. An origin list looked
    // tighter and was worse: it silently excluded localhost, so the handoff
    // could not be tested in development, and it would have failed closed
    // and unnoticed the day a new storefront launched. The signal is purely
    // cosmetic, and a page that has already chosen to embed us is exactly
    // who should decide how we look inside it.
    addEventListener("message", function (e) {
      if (e.source !== window.parent || window.parent === window) return;
      var d = e.data;
      if (!d || d.type !== "epic-calc-theme") return;
      if (d.theme === "light" || d.theme === "dark") {
        root.setAttribute("data-theme", d.theme);
      } else {
        root.removeAttribute("data-theme");
      }
    });
  } catch (e) {}
})();
`;

export async function generateMetadata() {
  try {
    const h = await headers();
    const site = await getSiteConfig({ host: h.get("host") });
    return {
      title: `Get an instant offer | ${site.siteName}`,
      description: "Get an instant offer for your device, no waiting, no haggling.",
    };
  } catch {
    return {
      title: "Get an instant offer | Sell Your Mac",
      description: "Get an instant offer for your Apple device, no waiting, no haggling.",
    };
  }
}

export default async function RootLayout({ children }) {
  let siteKey = null;
  try {
    const h = await headers();
    siteKey = (await getSiteConfig({ host: h.get("host") })).key;
  } catch {
    // Theming is not worth failing a render over; the group blue is the
    // correct answer for four of the five tenants anyway.
  }

  return (
    <html
      lang="en"
      className={`${satoshi.variable} h-full antialiased`}
      {...(THEMED_SITES.includes(siteKey) ? { "data-site": siteKey } : {})}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SITE_ATTR_SCRIPT }} />
      </head>
      {/* Ground and text colour come from globals.css, not utilities here --
          see the note on the html/body rule there. */}
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
