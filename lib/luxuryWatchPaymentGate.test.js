import assert from "node:assert/strict";
import test from "node:test";
import {
  LUXURY_WATCH_CASH_GATE_THRESHOLD,
  WATCH_CASH_GATE_TYPES,
  cartBlocksCashPayout,
  cashPayoutBlockedByCatalog,
  isCashPayoutPreference,
  isExcludedSmartwatchBrand,
  isLuxuryWatchCashPayoutBlocked,
  isWatchCategory,
} from "./luxuryWatchPaymentGate.js";

test("threshold is Good cash buy of R10,000", () => {
  assert.equal(LUXURY_WATCH_CASH_GATE_THRESHOLD, 10_000);
});

test("watch and luxury watch are the same gate category", () => {
  assert.deepEqual(WATCH_CASH_GATE_TYPES, ["watch", "luxury watch"]);
  assert.equal(isWatchCategory("Watch"), true);
  assert.equal(isWatchCategory("Luxury Watch"), true);
  assert.equal(isWatchCategory("luxury watch"), true);
  assert.equal(isWatchCategory("Smartwatch"), false);
  assert.equal(isWatchCategory("Phone"), false);
});

test("gates a luxury watch at or above the Good cash buy threshold", () => {
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Watch",
      brand: "Garmin",
      model: "Fenix 8",
      goodCashBuy: 10_000,
    }),
    true
  );
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Luxury Watch",
      brand: "Rolex",
      model: "Submariner",
      goodCashBuy: 85_000,
    }),
    true
  );
});

test("does not gate a watch under R10,000 Good cash buy", () => {
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Watch",
      brand: "Garmin",
      model: "Forerunner 165",
      goodCashBuy: 9_999,
    }),
    false
  );
});

test("excludes Apple, Samsung and Huawei watches even above R10k", () => {
  for (const brand of ["Apple", "Samsung", "Huawei"]) {
    assert.equal(
      isLuxuryWatchCashPayoutBlocked({
        categoryType: "Watch",
        brand,
        model: `${brand} Watch Ultra`,
        goodCashBuy: 15_000,
      }),
      false,
      brand
    );
    assert.equal(
      isLuxuryWatchCashPayoutBlocked({
        categoryType: "Luxury Watch",
        brand,
        model: `${brand} Watch Ultra`,
        goodCashBuy: 15_000,
      }),
      false,
      `${brand} Luxury Watch`
    );
  }
  assert.equal(isExcludedSmartwatchBrand(null, "Apple Watch Ultra 2"), true);
  assert.equal(isExcludedSmartwatchBrand("Garmin", "Fenix 8"), false);
});

test("does not treat pineapple-style substrings as Apple", () => {
  assert.equal(isExcludedSmartwatchBrand("Pineapple", "Pineapple Watch"), false);
});

test("non-watch categories are never gated", () => {
  assert.equal(isWatchCategory("Phone"), false);
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Phone",
      brand: "Rolex",
      model: "Submariner",
      goodCashBuy: 85_000,
    }),
    false
  );
});

test("missing Good cash buy does not invent a gate", () => {
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Watch",
      brand: "Omega",
      model: "Seamaster",
      goodCashBuy: null,
    }),
    false
  );
});

test("cart gates when any item is a luxury watch", () => {
  const cart = [
    { categoryType: "Phone", brand: "Apple", modelKey: "iphone 15", goodCashBuy: 12_000 },
    { categoryType: "Luxury Watch", brand: "Rolex", modelKey: "submariner", goodCashBuy: 85_000 },
  ];
  assert.equal(cartBlocksCashPayout(cart), true);
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "Watch", brand: "Garmin", modelKey: "fenix 8", goodCashBuy: 14_000 },
    ]),
    true
  );
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "Watch", brand: "Apple", modelKey: "watch ultra", goodCashBuy: 14_000 },
    ]),
    false
  );
});

test("cash payout preference is EFT or cash, not consignment or voucher", () => {
  assert.equal(isCashPayoutPreference("eft"), true);
  assert.equal(isCashPayoutPreference("cash"), true);
  assert.equal(isCashPayoutPreference("consignment"), false);
  assert.equal(isCashPayoutPreference("voucher"), false);
});

test("catalogue rows, not the client category, decide the server gate", () => {
  const items = [{ modelKey: "submariner", capacity: "N/A", categoryType: "Phone" }];
  const rows = [
    { model: "submariner", capacity: "N/A", type: "Watch", brand: "Rolex", buy_price: 85_000 },
  ];
  assert.equal(cashPayoutBlockedByCatalog(items, rows), true);
  assert.equal(
    cashPayoutBlockedByCatalog(items, [
      { model: "submariner", capacity: "N/A", type: "Luxury Watch", brand: "Rolex", buy_price: 85_000 },
    ]),
    true
  );
  assert.equal(
    cashPayoutBlockedByCatalog(items, [
      { model: "submariner", capacity: "N/A", type: "Watch", brand: "Apple", buy_price: 85_000 },
    ]),
    false
  );
});
