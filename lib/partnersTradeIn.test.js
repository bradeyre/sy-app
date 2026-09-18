import test from "node:test";
import assert from "node:assert/strict";
import { validatePartnerLead, buildJsonLd, FAQ, SEO } from "./partnersTradeIn.js";

const valid = {
  name: "Amina Patel",
  company: "Harbour Home",
  website: "harbourhome.co.za",
  role: "Founder / owner",
  email: "amina@harbourhome.co.za",
  phone: "082 123 4567",
  monthlyOrders: "50-200",
  categories: ["Furniture"],
  message: "",
};

test("accepts a complete SA partner lead and prefixes the website", () => {
  const result = validatePartnerLead(valid);
  assert.equal(result.ok, true);
  assert.equal(result.data.website, "https://harbourhome.co.za");
  assert.equal(result.data.phone, "0821234567");
});

test("rejects a missing category and a bad email", () => {
  const result = validatePartnerLead({ ...valid, email: "nope", categories: [] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.email);
  assert.ok(result.errors.categories);
});

test("JSON-LD carries Organization, WebPage and every FAQ", () => {
  const graph = buildJsonLd()["@graph"];
  const types = graph.map((node) => node["@type"]);
  assert.deepEqual(types, ["Organization", "WebPage", "FAQPage"]);
  assert.equal(graph[2].mainEntity.length, FAQ.length);
  assert.match(SEO.title, /Epic Deals/);
});
