import assert from "node:assert/strict";
import test from "node:test";
import { renderTermsHtml, TERMS_UPDATED } from "./terms.js";

const INSPECTION_CONSENT =
  "By submitting your device (excluding brand-new or factory-sealed units), you consent to our trusted technicians opening the device where needed to inspect for internal issues, including liquid damage. If your device is damaged during this inspection, Epic Deals will cover the cost of repair.";

const JARRED_ALT =
  "When submitting your device, you give consent to our trusted tech team to open up the device (excludes brand new/sealed units) to check for any internal issues such as Liquid Damage. Should anything break in the process, Epic Deals will cover the cost of repairs.";

const site = {
  key: "epicdeals",
  siteName: "Epic Deals",
  domain: "epicdeals.co.za",
};

test("TERMS_UPDATED is the publish date so caches revalidate", () => {
  assert.equal(TERMS_UPDATED, "2026-09-22");
});

test("buyback and consignment both carry the Jarred-approved inspection consent", () => {
  const html = renderTermsHtml(site);

  assert.match(html, /<section id="buyback">[\s\S]*<h3>6\. Device Inspection<\/h3>/);
  assert.match(html, /<section id="consignment">[\s\S]*<strong>5\.3 Device Inspection:<\/strong>/);
  assert.equal(html.split(INSPECTION_CONSENT).length - 1, 2);
  assert.doesNotMatch(html, new RegExp(JARRED_ALT.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

test("inserting Device Inspection does not break the POPIA cross-reference", () => {
  const html = renderTermsHtml(site);
  assert.match(html, /<h3>5\. Data Erasure \(POPIA\)<\/h3>/);
  assert.match(html, /clause 5 of the Buyback Terms/);
});

test("site names with reserved HTML characters stay escaped", () => {
  const html = renderTermsHtml({
    key: "sellyourmac",
    siteName: "Sell Your Mac & Co",
    domain: "sellyourmac.co.za",
  });
  assert.match(html, /Sell Your Mac &amp; Co/);
  assert.doesNotMatch(html, /Sell Your Mac & Co/);
});
