/**
 * Jarred / Buyback luxury payment gate.
 *
 * If a Watch or Luxury Watch has a Good-condition cash/EFT buy of R10,000
 * or more, the customer may only be offered Consignment and Trade-In
 * (voucher). Direct EFT / cash instant payout is not allowed.
 *
 * Apple, Samsung and Huawei smartwatches are excluded and keep normal
 * payment options even when Good cash buy is ≥ R10k.
 *
 * Every Luxury Handbag is consign / voucher only — no R10k threshold.
 *
 * This file is isomorphic on purpose: the calculator UI and the lead API
 * must apply the same rule. Do not import db or Node-only modules here.
 */

export const LUXURY_WATCH_CASH_GATE_THRESHOLD = 10_000;
export const LUXURY_WATCH_CASH_GATE_EXCLUDED_BRANDS = ["apple", "samsung", "huawei"];
/** Catalogue types the EFT gate treats as watches. Includes the future Luxury Watch backfill. */
export const WATCH_CASH_GATE_TYPES = ["watch", "luxury watch"];
/** Catalogue type that never qualifies for Direct EFT / cash, regardless of price. */
export const LUXURY_HANDBAG_TYPE = "luxury handbag";

const CASH_PAYOUT_KEYS = new Set(["eft", "cash"]);

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

function includesBrandToken(text, brand) {
  if (!text || !brand) return false;
  return new RegExp(`(?:^|[^a-z0-9])${brand}(?:[^a-z0-9]|$)`, "i").test(String(text));
}

export function isWatchCategory(type) {
  return WATCH_CASH_GATE_TYPES.includes(norm(type));
}

export function isLuxuryHandbagCategory(type) {
  return norm(type) === LUXURY_HANDBAG_TYPE;
}

/**
 * Every Luxury Handbag is consign / voucher only. No R10k threshold, no
 * brand exclusion.
 */
export function isLuxuryHandbagCashPayoutBlocked({ categoryType } = {}) {
  return isLuxuryHandbagCategory(categoryType);
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

export function cashPayoutGateNote(items) {
  const hasHandbag = (items || []).some((item) => isLuxuryHandbagCategory(item.categoryType));
  if (hasHandbag) {
    return "Instant EFT is not available for luxury handbags. You can choose consignment or an Epic Deals voucher.";
  }
  return "Instant EFT is not available for this watch. You can choose consignment or an Epic Deals voucher.";
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

function itemBlocksCashPayout(item) {
  return (
    isLuxuryHandbagCashPayoutBlocked({ categoryType: item.categoryType }) ||
    isLuxuryWatchCashPayoutBlocked({
      categoryType: item.categoryType,
      brand: item.brand,
      model: item.modelKey || item.model,
      goodCashBuy: item.goodCashBuy,
    })
  );
}

export function cartBlocksCashPayout(items) {
  return (items || []).some(itemBlocksCashPayout);
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
      isLuxuryHandbagCashPayoutBlocked({ categoryType: row.type }) ||
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
