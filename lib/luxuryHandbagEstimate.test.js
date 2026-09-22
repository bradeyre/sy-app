import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDBAG_ESTIMATE_COPY,
  HANDBAG_ESTIMATE_OF_LUXITY,
  applyHandbagEstimateToCapacities,
  applyHandbagEstimateToModels,
  cartHasHandbagEstimate,
  cartHasHandbagEstimateUnavailable,
  displayedHandbagEstimate,
} from "./luxuryHandbagEstimate.js";
import {
  cartBlocksHandbagCashPayout,
  isLuxuryHandbagCashPayoutBlocked,
} from "./luxuryHandbagPaymentGate.js";

test("estimate is 90% of Luxity sample median, rounded", () => {
  assert.equal(HANDBAG_ESTIMATE_OF_LUXITY, 0.9);
  assert.equal(displayedHandbagEstimate(42_000), 37_800);
  assert.equal(displayedHandbagEstimate(16_500), 14_850);
  assert.equal(displayedHandbagEstimate(10_001), 9_001);
});

test("missing or invalid Luxity sample yields null — never invents a Rand", () => {
  assert.equal(displayedHandbagEstimate(null), null);
  assert.equal(displayedHandbagEstimate(undefined), null);
  assert.equal(displayedHandbagEstimate(0), null);
  assert.equal(displayedHandbagEstimate(-100), null);
  assert.equal(displayedHandbagEstimate("nope"), null);
  assert.equal(displayedHandbagEstimate(NaN), null);
});

test("handbag capacities use estimate; firm buy_prices are not shown as offers", () => {
  const caps = [
    {
      capacity: "N/A",
      conditions: [
        { entryId: 1, condition: "Good", conditionLabel: "Good", price: 18_900 },
        { entryId: 2, condition: "Mint", conditionLabel: "Mint", price: 19_845 },
      ],
    },
  ];
  const out = applyHandbagEstimateToCapacities("Luxury Handbag", caps, 42_000);
  assert.equal(out.pricingMode, "estimate");
  assert.equal(out.estimate, 37_800);
  assert.equal(out.capacities[0].conditions[0].price, 37_800);
  assert.equal(out.capacities[0].conditions[1].price, 37_800);
  assert.equal(out.capacities[0].conditions[0].isEstimate, true);
  assert.equal(out.capacities[0].conditions[0].entryId, 1);
});

test("handbag with no Luxity sample → estimate unavailable, no fake price", () => {
  const caps = [
    {
      capacity: "N/A",
      conditions: [
        { entryId: 9, condition: "Good", conditionLabel: "Good", price: 3_210 },
      ],
    },
  ];
  const out = applyHandbagEstimateToCapacities("Luxury Handbag", caps, null);
  assert.equal(out.pricingMode, "estimate_unavailable");
  assert.equal(out.estimate, null);
  assert.equal(out.capacities[0].conditions[0].price, null);
  assert.equal(out.capacities[0].conditions[0].estimateUnavailable, true);
});

test("non-handbag capacities are unchanged (firm phone/watch offers)", () => {
  const caps = [
    {
      capacity: "128GB",
      conditions: [
        { entryId: 5, condition: "Good", conditionLabel: "Good", price: 4_500 },
      ],
    },
  ];
  const out = applyHandbagEstimateToCapacities("Phone", caps, 42_000);
  assert.equal(out.pricingMode, "firm");
  assert.equal(out.capacities[0].conditions[0].price, 4_500);
  assert.equal(out.estimate, null);
});

test("models list: estimate replaces from/to; missing sample clears prices", () => {
  const models = [
    { model: "camera bag", label: "Camera Bag", brand: "Chanel", fromPrice: 4725, toPrice: 22302 },
    { model: "dreamer bag", label: "Dreamer Bag", brand: "Coach", fromPrice: 803, toPrice: 3788 },
  ];
  const samples = new Map([
    ["camera bag", 42_000],
  ]);
  const out = applyHandbagEstimateToModels("Luxury Handbag", models, samples);
  assert.equal(out[0].pricingMode, "estimate");
  assert.equal(out[0].fromPrice, 37_800);
  assert.equal(out[0].toPrice, 37_800);
  assert.equal(out[1].pricingMode, "estimate_unavailable");
  assert.equal(out[1].fromPrice, null);
  assert.equal(out[1].toPrice, null);
});

test("non-handbag models list unchanged", () => {
  const models = [{ model: "iphone 13", fromPrice: 2000, toPrice: 5000 }];
  const out = applyHandbagEstimateToModels("Phone", models, new Map([["iphone 13", 99999]]));
  assert.equal(out[0].pricingMode, "firm");
  assert.equal(out[0].fromPrice, 2000);
});

test("Buyback copy strings are locked", () => {
  assert.equal(HANDBAG_ESTIMATE_COPY.label, "Estimate");
  assert.equal(
    HANDBAG_ESTIMATE_COPY.primary,
    "This is an estimate, not a final offer. We confirm after we see the bag."
  );
  assert.match(HANDBAG_ESTIMATE_COPY.helperUnderNumber, /about 60%/);
  assert.equal(
    HANDBAG_ESTIMATE_COPY.consignHelper,
    "Best fit for handbags. We list it, sell it, and you get about 60% of the sale. No instant EFT on bags."
  );
  assert.equal(HANDBAG_ESTIMATE_COPY.unavailableLabel, "Estimate on inspection");
});

test("EFT remains blocked for handbags (regression with estimate path)", () => {
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({ categoryType: "Luxury Handbag" }),
    true
  );
  assert.equal(
    cartBlocksHandbagCashPayout([
      {
        categoryType: "Luxury Handbag",
        isEstimate: true,
        basePrice: 37_800,
      },
    ]),
    true
  );
  assert.equal(
    cartBlocksHandbagCashPayout([
      { categoryType: "Phone", basePrice: 5_000 },
    ]),
    false
  );
});

test("cart estimate helpers", () => {
  assert.equal(
    cartHasHandbagEstimate([
      { categoryType: "Luxury Handbag", isEstimate: true, basePrice: 100 },
    ]),
    true
  );
  assert.equal(
    cartHasHandbagEstimateUnavailable([
      { categoryType: "Luxury Handbag", estimateUnavailable: true, basePrice: 0 },
    ]),
    true
  );
  assert.equal(cartHasHandbagEstimate([{ categoryType: "Watch" }]), false);
});
