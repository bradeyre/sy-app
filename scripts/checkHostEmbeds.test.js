import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  EMBED_LOADER_NEEDLE,
  analyzeEmbedContract,
  analyzeHostHtml,
  htmlLooksBlocked,
  wpRenderedContent,
} from "./checkHostEmbeds.js";

const LIVE_OUTAGE_SNIPPET = `
<div class="gb-container gb-container-ec17a7e6">
<p class="gb-headline gb-headline-text">South Africa’s top-rated trade-in service</p>
</div>
<div data-sym-calculator data-site="epicdeals" data-theme="light" style="min-height:720px"></div>
<section class="ed-sec ed-how"><h2>How it works</h2></section>
`;

const HEALTHY_SNIPPET = `
<div data-sym-calculator data-site="epicdeals" data-theme="light" style="min-height:720px"></div>
<script src="https://sym-calculator.vercel.app/embed.js" defer></script>
`;

test("live 2026-09-17 /sell/ HTML is the missing-loader outage", () => {
  const result = analyzeHostHtml(LIVE_OUTAGE_SNIPPET);
  assert.equal(result.ok, false);
  assert.equal(result.code, "missing-loader");
  assert.equal(result.hasMount, true);
  assert.equal(result.hasLoader, false);
});

test("documented two-line snippet satisfies the host contract", () => {
  const result = analyzeHostHtml(HEALTHY_SNIPPET);
  assert.equal(result.ok, true);
  assert.equal(result.code, "ok");
  assert.equal(result.hasMount, true);
  assert.equal(result.hasLoader, true);
});

test("Perfmatters-delayed script src still counts as the loader", () => {
  const html = `
    <div data-sym-calculator data-site="epicdeals" data-theme="light"></div>
    <script type="pmdelayedscript" src="https://sym-calculator.vercel.app/embed.js" defer></script>
  `;
  assert.equal(analyzeHostHtml(html).ok, true);
});

test("loader mentioned only in an HTML comment does not count", () => {
  const html = `
    <div data-sym-calculator data-site="epicdeals" data-theme="light"></div>
    <!-- <script src="https://sym-calculator.vercel.app/embed.js" defer></script> -->
  `;
  const result = analyzeHostHtml(html);
  assert.equal(result.ok, false);
  assert.equal(result.code, "missing-loader");
});

test("required host page with no mount fails", () => {
  const result = analyzeHostHtml("<html><title>Sell To Us</title><p>empty</p></html>");
  assert.equal(result.ok, false);
  assert.equal(result.code, "missing-mount");
});

test("legacy #ed-calculator mount is still recognized", () => {
  const html = `
    <div id="ed-calculator"></div>
    <script src="https://sym-calculator.vercel.app/embed.js" defer></script>
  `;
  assert.equal(analyzeHostHtml(html).ok, true);
});

test("protocol-relative loader src counts", () => {
  const html = `
    <div data-sym-calculator></div>
    <script src="//sym-calculator.vercel.app/embed.js"></script>
  `;
  assert.equal(analyzeHostHtml(html).ok, true);
});

test("Cloudflare challenge HTML is treated as unreachable, not a missing mount", () => {
  const challenge = `<html><title>Just a moment...</title><div id="cf-challenge"></div></html>`;
  assert.equal(htmlLooksBlocked(challenge, 200), true);
  assert.equal(htmlLooksBlocked(LIVE_OUTAGE_SNIPPET, 200), false);
  assert.equal(htmlLooksBlocked(HEALTHY_SNIPPET, 403), false);
  assert.equal(htmlLooksBlocked("<html>nope</html>", 403), true);
});

test("WP REST payload exposes rendered content for diagnostics", () => {
  assert.equal(
    wpRenderedContent({ content: { rendered: HEALTHY_SNIPPET } }).includes(EMBED_LOADER_NEEDLE),
    true
  );
  assert.equal(wpRenderedContent({ content: LIVE_OUTAGE_SNIPPET }), LIVE_OUTAGE_SNIPPET);
  assert.equal(wpRenderedContent(null), "");
});

test("public/embed.js is still the documented host-page contract", () => {
  const here = dirname(fileURLToPath(import.meta.url));
  const source = readFileSync(join(here, "../public/embed.js"), "utf8");
  const result = analyzeEmbedContract(source);
  assert.equal(result.ok, true, result.message);
  assert.match(source, /script src="https:\/\/sym-calculator\.vercel\.app\/embed\.js"/);
});
