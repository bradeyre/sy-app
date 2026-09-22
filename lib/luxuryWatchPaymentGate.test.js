import assert from "node:assert/strict";
import test from "node:test";
import {
  LUXURY_WATCH_CASH_GATE_THRESHOLD,
  WATCH_CASH_GATE_TYPES,
  cartBlocksCashPayout,
  cashPayoutBlockedByCatalog,
  isCashPayoutPreference,
  isExcludedSmartwatchBrand,
  cashPayoutGateNote,
  isLuxuryHandbagCashPayoutBlocked,
  isLuxuryHandbagCategory,
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

test("non-watch categories are never gated by the watch rule", () => {
  assert.equal(isWatchCategory("Phone"), false);
  assert.equal(isWatchCategory("Luxury Handbag"), false);
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Phone",
      brand: "Rolex",
      model: "Submariner",
      goodCashBuy: 85_000,
    }),
    false
  );
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Louis Vuitton",
      model: "Neverfull",
      goodCashBuy: 1_000,
    }),
    false
  );
});

test("Luxury Handbag always blocks cash/EFT with no R10k threshold", () => {
  assert.equal(isLuxuryHandbagCategory("Luxury Handbag"), true);
  assert.equal(isLuxuryHandbagCategory("luxury handbag"), true);
  assert.equal(isLuxuryHandbagCategory("LUXURY HANDBAG"), true);
  assert.equal(isLuxuryHandbagCategory("Watch"), false);
  assert.equal(isLuxuryHandbagCategory("Phone"), false);
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Louis Vuitton",
      model: "Neverfull MM",
      goodCashBuy: 500,
    }),
    true
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "luxury handbag",
      brand: "Apple",
      model: "Tote",
      goodCashBuy: 1,
    }),
    true
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Chanel",
      model: "Classic Flap",
      goodCashBuy: null,
    }),
    true
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Phone",
      brand: "Chanel",
      model: "Classic Flap",
      goodCashBuy: 85_000,
    }),
    false
  );
});

test("cart gates when any item is a luxury handbag", () => {
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "Phone", brand: "Apple", modelKey: "iphone 15", goodCashBuy: 12_000 },
      { categoryType: "Luxury Handbag", brand: "Gucci", modelKey: "marmont", goodCashBuy: 800 },
    ]),
    true
  );
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "luxury handbag", brand: "Prada", modelKey: "re-edition", goodCashBuy: null },
    ]),
    true
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

test("payment-step note names handbags when a handbag is in the cart", () => {
  assert.equal(
    cashPayoutGateNote([{ categoryType: "Luxury Handbag", brand: "Gucci", modelKey: "marmont" }]).includes(
      "luxury handbags"
    ),
    true
  );
  assert.equal(
    cashPayoutGateNote([{ categoryType: "Watch", brand: "Garmin", modelKey: "fenix 8" }]).includes("watch"),
    true
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

test("catalogue Luxury Handbag rows always block cash even if the client lies", () => {
  const items = [{ modelKey: "neverfull mm", capacity: "N/A", categoryType: "Phone" }];
  assert.equal(
    cashPayoutBlockedByCatalog(items, [
      { model: "neverfull mm", capacity: "N/A", type: "Luxury Handbag", brand: "Louis Vuitton", buy_price: 400 },
    ]),
    true
  );
  assert.equal(
    cashPayoutBlockedByCatalog(items, [
      { model: "neverfull mm", capacity: "N/A", type: "luxury handbag", brand: "Louis Vuitton", buy_price: null },
    ]),
    true
  );
});

test("watch R10k gate is unchanged beside the handbag rule", () => {
  assert.equal(
    isLuxuryWatchCashPayoutBlocked({
      categoryType: "Watch",
      brand: "Garmin",
      model: "Forerunner 165",
      goodCashBuy: 9_999,
    }),
    false
  );
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "Watch", brand: "Garmin", modelKey: "forerunner 165", goodCashBuy: 9_999 },
    ]),
    false
  );
  assert.equal(
    cartBlocksCashPayout([
      { categoryType: "Watch", brand: "Apple", modelKey: "watch ultra", goodCashBuy: 14_000 },
    ]),
    false
  );
});
