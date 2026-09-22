import assert from "node:assert/strict";
import test from "node:test";
import {
  HANDBAG_CASH_GATE_TYPES,
  cartBlocksHandbagCashPayout,
  handbagCashPayoutBlockedByCatalog,
  isCashPayoutPreference,
  isLuxuryHandbagCashPayoutBlocked,
  isLuxuryHandbagCategory,
} from "./luxuryHandbagPaymentGate.js";

test("only Luxury Handbag is the handbag gate category", () => {
  assert.deepEqual(HANDBAG_CASH_GATE_TYPES, ["luxury handbag"]);
  assert.equal(isLuxuryHandbagCategory("Luxury Handbag"), true);
  assert.equal(isLuxuryHandbagCategory("luxury handbag"), true);
  assert.equal(isLuxuryHandbagCategory("Handbag"), false);
  assert.equal(isLuxuryHandbagCategory("Watch"), false);
  assert.equal(isLuxuryHandbagCategory("Luxury Watch"), false);
});

test("gates every Luxury Handbag regardless of Good cash buy", () => {
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Louis Vuitton",
      model: "Neverfull",
      goodCashBuy: 500,
    }),
    true
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Chanel",
      model: "Classic Flap",
      goodCashBuy: 85_000,
    }),
    true
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Handbag",
      brand: "Gucci",
      model: "Dionysus",
      goodCashBuy: null,
    }),
    true
  );
});

test("non-handbag categories are never gated by the handbag rule", () => {
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Watch",
      brand: "Rolex",
      model: "Submariner",
      goodCashBuy: 85_000,
    }),
    false
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Luxury Watch",
      brand: "Rolex",
      model: "Submariner",
      goodCashBuy: 85_000,
    }),
    false
  );
  assert.equal(
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: "Phone",
      brand: "Apple",
      model: "iPhone 15",
      goodCashBuy: 12_000,
    }),
    false
  );
});

test("cart gates when any item is a Luxury Handbag", () => {
  assert.equal(
    cartBlocksHandbagCashPayout([
      { categoryType: "Phone", brand: "Apple", modelKey: "iphone 15", goodCashBuy: 12_000 },
      { categoryType: "Luxury Handbag", brand: "Chanel", modelKey: "classic flap", goodCashBuy: 500 },
    ]),
    true
  );
  assert.equal(
    cartBlocksHandbagCashPayout([
      { categoryType: "Watch", brand: "Garmin", modelKey: "fenix 8", goodCashBuy: 14_000 },
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
  const items = [{ modelKey: "neverfull", capacity: "N/A", categoryType: "Phone" }];
  assert.equal(
    handbagCashPayoutBlockedByCatalog(items, [
      { model: "neverfull", capacity: "N/A", type: "Luxury Handbag", brand: "Louis Vuitton", buy_price: 8_000 },
    ]),
    true
  );
  assert.equal(
    handbagCashPayoutBlockedByCatalog(items, [
      { model: "neverfull", capacity: "N/A", type: "Phone", brand: "Louis Vuitton", buy_price: 8_000 },
    ]),
    false
  );
});
