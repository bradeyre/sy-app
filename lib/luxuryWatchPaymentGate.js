/**
 * Jarred / Buyback luxury-watch payment gate.
 *
 * If a Watch has a Good-condition cash/EFT buy of R10,000 or more, the
 * customer may only be offered Consignment and Trade-In (voucher). Direct
 * EFT / cash instant payout is not allowed.
 *
 * Apple, Samsung and Huawei smartwatches are excluded and keep normal
 * payment options even when Good cash buy is ≥ R10k.
 *
 * This file is isomorphic on purpose: the calculator UI and the lead API
 * must apply the same rule. Do not import db or Node-only modules here.
 */

export const LUXURY_WATCH_CASH_GATE_THRESHOLD = 10_000;
export const LUXURY_WATCH_CASH_GATE_EXCLUDED_BRANDS = ["apple", "samsung", "huawei"];

const CASH_PAYOUT_KEYS = new Set(["eft", "cash"]);

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function includesBrandToken(text, brand) {
  if (!text || !brand) return false;
  return new RegExp(`(?:^|[^a-z0-9])${brand}(?:[^a-z0-9]|$)`, "i").test(String(text));
}

export function isWatchCategory(type) {
  return norm(type) === "watch";
}

/**
 * Exclusion is brand-level, with the model string as a fallback so an
 * Apple/Samsung/Huawei watch is not gated if the catalogue brand is blank.
 */
export function isExcludedSmartwatchBrand(brand, model) {
  return LUXURY_WATCH_CASH_GATE_EXCLUDED_BRANDS.some(
    (b) => includesBrandToken(brand, b) || includesBrandToken(model, b)
  );
}

export function isCashPayoutPreference(preference) {
  return CASH_PAYOUT_KEYS.has(norm(preference));
}

/**
 * Value signal is Good cash buy (catalogue buy_price for condition Good),
 * not the selected condition, not sell/resale, and not voucher/consignment
 * uplift.
 */
export function isLuxuryWatchCashPayoutBlocked({
  categoryType,
  brand,
  model,
  goodCashBuy,
} = {}) {
  if (!isWatchCategory(categoryType)) return false;
  if (isExcludedSmartwatchBrand(brand, model)) return false;
  const price = Number(goodCashBuy);
  return Number.isFinite(price) && price >= LUXURY_WATCH_CASH_GATE_THRESHOLD;
}

export function cartBlocksCashPayout(items) {
  return (items || []).some((item) =>
    isLuxuryWatchCashPayoutBlocked({
      categoryType: item.categoryType,
      brand: item.brand,
      model: item.modelKey || item.model,
      goodCashBuy: item.goodCashBuy,
    })
  );
}

const normCap = (capacity) => capacity || "N/A";

/**
 * Server-side match: use the catalogue's type/brand/Good buy_price, never
 * the client's claimed category or price.
 */
export function cashPayoutBlockedByCatalog(items, goodRows) {
  const rows = goodRows || [];
  for (const item of items || []) {
    const model = item.modelKey || item.model;
    if (!model) continue;
    const matches = rows.filter((row) => row.model === model);
    const row =
      matches.find((candidate) => normCap(candidate.capacity) === normCap(item.capacity)) ||
      matches[0];
    if (!row) continue;
    if (
      isLuxuryWatchCashPayoutBlocked({
        categoryType: row.type,
        brand: row.brand,
        model: row.model,
        goodCashBuy: row.buy_price,
      })
    ) {
      return true;
    }
  }
  return false;
}
