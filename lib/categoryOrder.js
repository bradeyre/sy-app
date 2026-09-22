/**
 * Sell-form category order.
 *
 * Cockpit `category_filter` array order is the default. The Watch family is
 * the exception: when both Watch and Luxury Watch are present, Luxury Watch
 * sits immediately under Watch. Other types keep their relative order.
 *
 * Do not edit this list from the cockpit expecting Watch / Luxury Watch
 * positions to stick — this helper wins.
 */

const WATCH_TYPE = "watch";
const LUXURY_WATCH_TYPE = "luxury watch";

function typeKey(category) {
  return String(category?.type || "").trim().toLowerCase();
}

export function orderWatchFamily(categories) {
  if (!Array.isArray(categories) || categories.length < 2) {
    return Array.isArray(categories) ? categories : [];
  }

  const luxuryIndex = categories.findIndex((c) => typeKey(c) === LUXURY_WATCH_TYPE);
  const watchIndex = categories.findIndex((c) => typeKey(c) === WATCH_TYPE);
  if (luxuryIndex === -1 || watchIndex === -1) return categories;
  if (luxuryIndex === watchIndex + 1) return categories;

  const next = categories.slice();
  const [luxury] = next.splice(luxuryIndex, 1);
  const watchAt = next.findIndex((c) => typeKey(c) === WATCH_TYPE);
  next.splice(watchAt + 1, 0, luxury);
  return next;
}
