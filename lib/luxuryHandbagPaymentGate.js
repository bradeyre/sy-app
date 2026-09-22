/**
 * Buyback luxury-handbag payment gate.
 *
 * ALL offers where the catalogue type/category is Luxury Handbag may only
 * be offered Consignment and Trade-In (voucher). Direct EFT / cash instant
 * payout is never allowed — no R10k threshold (unlike watches).
 *
 * This file is isomorphic on purpose: the calculator UI and the lead API
 * must apply the same rule. Do not import db or Node-only modules here.
 */

export const HANDBAG_CASH_GATE_TYPES = ["luxury handbag"];

const CASH_PAYOUT_KEYS = new Set(["eft", "cash"]);

function norm(value) {
  return String(value || "").trim().toLowerCase();
}

export function isLuxuryHandbagCategory(type) {
  return HANDBAG_CASH_GATE_TYPES.includes(norm(type));
}

export function isCashPayoutPreference(preference) {
  return CASH_PAYOUT_KEYS.has(norm(preference));
}

/**
 * Every Luxury Handbag blocks cash/EFT. Brand and Good cash buy are ignored.
 */
export function isLuxuryHandbagCashPayoutBlocked({ categoryType } = {}) {
  return isLuxuryHandbagCategory(categoryType);
}

export function cartBlocksHandbagCashPayout(items) {
  return (items || []).some((item) =>
    isLuxuryHandbagCashPayoutBlocked({
      categoryType: item.categoryType,
    })
  );
}

const normCap = (capacity) => capacity || "N/A";

/**
 * Server-side match: use the catalogue type, never the client's claimed
 * category.
 */
export function handbagCashPayoutBlockedByCatalog(items, goodRows) {
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
      isLuxuryHandbagCashPayoutBlocked({
        categoryType: row.type,
      })
    ) {
      return true;
    }
  }
  return false;
}
