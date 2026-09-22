/**
 * Luxury Handbag estimate path (Buyback commercial).
 *
 * Handbags are consign + Trade-In voucher only (see luxuryHandbagPaymentGate).
 * The calculator must never present thin Good cash buy_prices as a firm
 * electronic cash buy. Displayed figure = ESTIMATE only:
 *   displayedEstimate = round(Luxity sample median × 0.9)
 * When no Luxity-sourced median exists, show estimate-unavailable — never
 * invent a Rand amount.
 *
 * Isomorphic: safe for UI + unit tests. DB reads live in *.server.js.
 */

import { isLuxuryHandbagCategory } from "./luxuryHandbagPaymentGate.js";

/** Fraction of Luxity sell-sample median used for the customer-facing estimate. */
export const HANDBAG_ESTIMATE_OF_LUXITY = 0.9;

export const HANDBAG_ESTIMATE_COPY = {
  label: "Estimate",
  primary:
    "This is an estimate, not a final offer. We confirm after we see the bag.",
  helperUnderNumber:
    "Based on recent luxury resale prices, set a touch under the market so we can move it. On consignment you typically get about 60% of what we sell it for.",
  unavailableLabel: "Estimate on inspection",
  unavailableHelper:
    "We do not have a market sample for this bag yet. Send it through and we will get back to you with an estimate after we see it.",
  consignHelper:
    "Best fit for handbags. We list it, sell it, and you get about 60% of the sale. No instant EFT on bags.",
  quoteDisclaimer:
    "This is an estimate, not a final offer. We confirm after we see the bag.",
};

/**
 * @param {unknown} luxitySampleMedian
 * @returns {number|null} round(median × 0.9), or null when median missing/invalid
 */
export function displayedHandbagEstimate(luxitySampleMedian) {
  const median = Number(luxitySampleMedian);
  if (!Number.isFinite(median) || median <= 0) return null;
  return Math.round(median * HANDBAG_ESTIMATE_OF_LUXITY);
}

/**
 * Map a quote API capacity/condition payload onto the handbag estimate path.
 * Non-handbags are returned unchanged (firm cash buy path).
 *
 * @param {string|undefined|null} categoryType
 * @param {{ capacity: string, conditions: Array<{ entryId: number, condition: string, conditionLabel: string, price: number }> }[]} capacities
 * @param {number|null|undefined} luxitySampleMedian
 */
export function applyHandbagEstimateToCapacities(
  categoryType,
  capacities,
  luxitySampleMedian
) {
  if (!isLuxuryHandbagCategory(categoryType)) {
    return {
      pricingMode: "firm",
      estimate: null,
      capacities,
    };
  }

  const estimate = displayedHandbagEstimate(luxitySampleMedian);
  if (estimate == null) {
    return {
      pricingMode: "estimate_unavailable",
      estimate: null,
      capacities: (capacities || []).map((cap) => ({
        ...cap,
        conditions: (cap.conditions || []).map((c) => ({
          ...c,
          price: null,
          estimateUnavailable: true,
        })),
      })),
    };
  }

  return {
    pricingMode: "estimate",
    estimate,
    capacities: (capacities || []).map((cap) => ({
      ...cap,
      conditions: (cap.conditions || []).map((c) => ({
        ...c,
        // Keep entryId for lead tracking; replace firm buy with estimate.
        price: estimate,
        isEstimate: true,
      })),
    })),
  };
}

/**
 * Models list: replace firm from/to buy with estimate when handbag + sample.
 */
export function applyHandbagEstimateToModels(categoryType, models, sampleByModel) {
  if (!isLuxuryHandbagCategory(categoryType)) {
    return (models || []).map((m) => ({ ...m, pricingMode: "firm" }));
  }
  const map = sampleByModel || new Map();
  return (models || []).map((m) => {
    const median = map.get(String(m.model || "").toLowerCase());
    const estimate = displayedHandbagEstimate(median);
    if (estimate == null) {
      return {
        ...m,
        fromPrice: null,
        toPrice: null,
        pricingMode: "estimate_unavailable",
        estimate: null,
      };
    }
    return {
      ...m,
      fromPrice: estimate,
      toPrice: estimate,
      pricingMode: "estimate",
      estimate,
    };
  });
}

export function cartHasHandbagEstimate(items) {
  return (items || []).some(
    (item) =>
      isLuxuryHandbagCategory(item.categoryType) && item.isEstimate !== false
  );
}

export function cartHasHandbagEstimateUnavailable(items) {
  return (items || []).some(
    (item) =>
      isLuxuryHandbagCategory(item.categoryType) && item.estimateUnavailable
  );
}
