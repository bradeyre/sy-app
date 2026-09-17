/**
 * Live probe for production host pages that must load embed.js.
 *
 * Exit codes:
 *   0  every reachable host satisfies the contract, or every host was
 *      unreachable (SKIP — CI cannot see the site; do not treat as healthy)
 *   1  a reachable host has data-sym-calculator without embed.js, or is
 *      missing the mount entirely
 *
 * Unreachable means network error, timeout, HTTP 4xx/5xx, or a Cloudflare
 * challenge page. Those are printed as SKIP so GitHub Actions does not
 * flake when WAF blocks the runner. A blank /sell/ calculator is FAIL.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  EMBED_LOADER_NEEDLE,
  REQUIRED_HOSTS,
  analyzeEmbedContract,
  analyzeHostHtml,
  htmlLooksBlocked,
  wpRenderedContent,
} from "./checkHostEmbeds.js";

const USER_AGENT = "sym-calculator-embed-guard/1.0 (+https://github.com/bradeyre/sy-app)";
const TIMEOUT_MS = 20_000;
const LOADER_URL = `https://${EMBED_LOADER_NEEDLE}`;

async function fetchText(url) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": USER_AGENT, accept: "text/html,application/json;q=0.9,*/*;q=0.8" },
    });
    const text = await res.text();
    return { ok: true, status: res.status, text, finalUrl: res.url };
  } catch (err) {
    return { ok: false, status: 0, text: "", error: err };
  } finally {
    clearTimeout(timer);
  }
}

function print(line) {
  process.stdout.write(`${line}\n`);
}

function restoreSnippet() {
  return [
    `<div data-sym-calculator data-site="epicdeals" data-theme="light" style="min-height:720px"></div>`,
    `<script src="https://${EMBED_LOADER_NEEDLE}" defer></script>`,
  ].join("\n");
}

async function checkLoaderFile() {
  const fetched = await fetchText(LOADER_URL);
  if (!fetched.ok) {
    print(`SKIP ${LOADER_URL} — could not fetch embed.js (${fetched.error?.cause?.code || fetched.error?.name || "network error"})`);
    return { skip: true, fail: false };
  }
  if (fetched.status !== 200) {
    print(`FAIL ${LOADER_URL} — HTTP ${fetched.status} (expected 200)`);
    return { skip: false, fail: true };
  }
  const contract = analyzeEmbedContract(fetched.text);
  if (!contract.ok) {
    print(`FAIL ${LOADER_URL} — ${contract.message}`);
    return { skip: false, fail: true };
  }
  print(`OK   ${LOADER_URL} — HTTP 200, documented contract intact`);
  return { skip: false, fail: false };
}

async function diagnoseWp(host, publicResult) {
  if (!host.wpJsonUrl) return;
  const fetched = await fetchText(host.wpJsonUrl);
  if (!fetched.ok || fetched.status !== 200) {
    print(`     WP REST: SKIP (HTTP ${fetched.status || "error"})`);
    return;
  }
  let payload;
  try {
    payload = JSON.parse(fetched.text);
  } catch {
    print("     WP REST: SKIP (not JSON)");
    return;
  }
  const rendered = wpRenderedContent(payload);
  const stored = analyzeHostHtml(rendered, { requireMount: host.requireMount !== false });
  const modified = payload.modified ? ` last modified ${payload.modified}` : "";
  print(`     WP REST: ${stored.ok ? "OK" : stored.code}${modified}`);
  if (!publicResult.ok && !stored.ok && stored.code === "missing-loader") {
    print("     Cause: stored page content is missing the embed.js <script src>.");
    print("     Live restore is a WordPress admin edit (this repo cannot publish it). Restore:");
    for (const line of restoreSnippet().split("\n")) print(`       ${line}`);
  } else if (!publicResult.ok && stored.ok) {
    print("     Cause: WP content still has embed.js, but the public HTML does not.");
    print("     Check Cloudflare / Perfmatters / page-cache — they likely stripped the script tag.");
  }
}

async function checkHost(host) {
  const fetched = await fetchText(host.url);
  if (!fetched.ok) {
    const why = fetched.error?.cause?.code || fetched.error?.message || fetched.error?.name || "network error";
    print(`SKIP ${host.name} — CI cannot reach ${host.url} (${why})`);
    return { skip: true, fail: false };
  }
  if (htmlLooksBlocked(fetched.text, fetched.status)) {
    print(`SKIP ${host.name} — ${host.url} looked blocked or unreachable (HTTP ${fetched.status})`);
    return { skip: true, fail: false };
  }

  const result = analyzeHostHtml(fetched.text, { requireMount: host.requireMount !== false });
  if (result.ok) {
    print(`OK   ${host.name} — ${result.message}`);
    return { skip: false, fail: false };
  }

  print(`FAIL ${host.name} — ${result.message}`);
  print(`     GET ${host.url} → HTTP ${fetched.status} (${fetched.text.length} bytes)`);
  await diagnoseWp(host, result);
  return { skip: false, fail: true };
}

async function main() {
  const here = dirname(fileURLToPath(import.meta.url));
  const localEmbed = readFileSync(join(here, "../public/embed.js"), "utf8");
  const localContract = analyzeEmbedContract(localEmbed);
  if (!localContract.ok) {
    print(`FAIL public/embed.js — ${localContract.message}`);
    process.exit(1);
  }
  print(`OK   public/embed.js — ${localContract.message}`);

  let fails = 0;
  let skips = 0;
  let passes = 0;

  const loader = await checkLoaderFile();
  if (loader.fail) fails += 1;
  else if (loader.skip) skips += 1;
  else passes += 1;

  for (const host of REQUIRED_HOSTS) {
    const outcome = await checkHost(host);
    if (outcome.fail) fails += 1;
    else if (outcome.skip) skips += 1;
    else passes += 1;
  }

  print("");
  if (fails) {
    print(`Host embed check failed (${fails} fail, ${passes} ok, ${skips} skip).`);
    process.exit(1);
  }
  if (skips && !passes) {
    print(
      "SKIP: CI could not reach any host page or embed.js. " +
        "This is not a pass — the production contract was not verified. " +
        "Re-run locally: npm run test:live-embeds"
    );
    process.exit(0);
  }
  if (skips) {
    print(`Host embed check passed with skips (${passes} ok, ${skips} skip).`);
  } else {
    print(`Host embed check passed (${passes} ok).`);
  }
}

await main();
