import assert from "node:assert/strict";
import test from "node:test";
import { orderWatchFamily } from "./categoryOrder.js";

const types = (categories) => categories.map((c) => c.type);

test("pins Luxury Watch under Watch for the live epicdeals catalogue order", () => {
  const live = [
    "Phone",
    "Laptop",
    "Tablet",
    "Desktop",
    "Watch",
    "Earphone",
    "Console",
    "Vacuum",
    "Coffee Machine",
    "Hair Care",
    "Air Purifier",
    "Action Camera",
    "Headphones",
    "Speaker",
    "VR Headset",
    "Luxury Watch",
  ].map((type) => ({ type }));

  assert.deepEqual(types(orderWatchFamily(live)), [
    "Phone",
    "Laptop",
    "Tablet",
    "Desktop",
    "Watch",
    "Luxury Watch",
    "Earphone",
    "Console",
    "Vacuum",
    "Coffee Machine",
    "Hair Care",
    "Air Purifier",
    "Action Camera",
    "Headphones",
    "Speaker",
    "VR Headset",
  ]);
});

test("moves Luxury Watch immediately under Watch when it is last", () => {
  const input = [
    { type: "Phone" },
    { type: "Laptop" },
    { type: "Tablet" },
    { type: "Desktop" },
    { type: "Watch" },
    { type: "Earphone" },
    { type: "Console" },
    { type: "VR Headset" },
    { type: "Luxury Watch" },
  ];

  assert.deepEqual(types(orderWatchFamily(input)), [
    "Phone",
    "Laptop",
    "Tablet",
    "Desktop",
    "Watch",
    "Luxury Watch",
    "Earphone",
    "Console",
    "VR Headset",
  ]);
});

test("leaves an already-adjacent Watch family untouched", () => {
  const input = [{ type: "Phone" }, { type: "Watch" }, { type: "Luxury Watch" }, { type: "Console" }];
  assert.equal(orderWatchFamily(input), input);
});

test("moves Luxury Watch after Watch when it appears first", () => {
  const input = [
    { type: "Luxury Watch" },
    { type: "Phone" },
    { type: "Watch" },
    { type: "Console" },
  ];

  assert.deepEqual(types(orderWatchFamily(input)), [
    "Phone",
    "Watch",
    "Luxury Watch",
    "Console",
  ]);
});

test("keeps other categories in their original relative order", () => {
  const input = [
    { type: "Phone" },
    { type: "Watch" },
    { type: "Laptop" },
    { type: "Tablet" },
    { type: "Luxury Watch" },
    { type: "Desktop" },
  ];

  assert.deepEqual(types(orderWatchFamily(input)), [
    "Phone",
    "Watch",
    "Luxury Watch",
    "Laptop",
    "Tablet",
    "Desktop",
  ]);
});

test("does not invent a missing Watch or Luxury Watch", () => {
  const watchOnly = [{ type: "Phone" }, { type: "Watch" }, { type: "Console" }];
  const luxuryOnly = [{ type: "Phone" }, { type: "Luxury Watch" }, { type: "Console" }];
  assert.equal(orderWatchFamily(watchOnly), watchOnly);
  assert.equal(orderWatchFamily(luxuryOnly), luxuryOnly);
});

test("matches Watch family types case-insensitively", () => {
  const input = [{ type: "phone" }, { type: "WATCH" }, { type: "console" }, { type: "luxury watch" }];
  assert.deepEqual(types(orderWatchFamily(input)), ["phone", "WATCH", "luxury watch", "console"]);
});

test("returns empty for missing or single-item lists", () => {
  assert.deepEqual(orderWatchFamily(null), []);
  assert.deepEqual(orderWatchFamily(undefined), []);
  const one = [{ type: "Watch" }];
  assert.equal(orderWatchFamily(one), one);
});

test("preserves category objects, not just type strings", () => {
  const luxury = { type: "Luxury Watch", label: "Luxury Watch", skuCount: 19 };
  const watch = { type: "Watch", label: "Watch", skuCount: 79 };
  const phone = { type: "Phone", label: "Phone", skuCount: 260 };
  const ordered = orderWatchFamily([phone, luxury, watch]);
  assert.equal(ordered[0], phone);
  assert.equal(ordered[1], watch);
  assert.equal(ordered[2], luxury);
});
