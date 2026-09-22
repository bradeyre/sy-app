/**
 * Sell-form category order.
 *
 * Cockpit `category_filter` array order is the default. The Watch family is
 * the exception: when present, the order is Watch → Luxury Watch → Luxury
 * Handbag, kept adjacent. Other types keep their relative order.
 *
 * Do not edit this list from the cockpit expecting Watch family positions
 * to stick — this helper wins.
 */

const WATCH_TYPE = "watch";
const LUXURY_WATCH_TYPE = "luxury watch";
const LUXURY_HANDBAG_TYPE = "luxury handbag";

function typeKey(category) {
  return String(category?.type || "").trim().toLowerCase();
}

function pinAfterAnchor(categories, movingType, anchorType) {
  const movingIndex = categories.findIndex((c) => typeKey(c) === movingType);
  const anchorIndex = categories.findIndex((c) => typeKey(c) === anchorType);
  if (movingIndex === -1 || anchorIndex === -1) return categories;
  if (movingIndex === anchorIndex + 1) return categories;

  const next = categories.slice();
  const [moving] = next.splice(movingIndex, 1);
  const anchorAt = next.findIndex((c) => typeKey(c) === anchorType);
  next.splice(anchorAt + 1, 0, moving);
  return next;
}

export function orderWatchFamily(categories) {
  if (!Array.isArray(categories) || categories.length < 2) {
    return Array.isArray(categories) ? categories : [];
  }

  let next = pinAfterAnchor(categories, LUXURY_WATCH_TYPE, WATCH_TYPE);
  const handbagAnchor = next.some((c) => typeKey(c) === LUXURY_WATCH_TYPE)
    ? LUXURY_WATCH_TYPE
    : WATCH_TYPE;
  next = pinAfterAnchor(next, LUXURY_HANDBAG_TYPE, handbagAnchor);
  return next;
}
