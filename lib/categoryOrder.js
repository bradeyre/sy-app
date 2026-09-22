/**
 * Sell-form category order.
 *
 * Cockpit `category_filter` array order is the default. The Watch/luxury
 * family is the exception: when present, they pin as
 *   Watch → Luxury Watch → Luxury Handbag
 * Other types keep their relative order.
 *
 * Do not edit this list from the cockpit expecting these positions to
 * stick — this helper wins.
 */

const WATCH_TYPE = "watch";
const LUXURY_WATCH_TYPE = "luxury watch";
const LUXURY_HANDBAG_TYPE = "luxury handbag";

function typeKey(category) {
  return String(category?.type || "").trim().toLowerCase();
}

export function orderWatchFamily(categories) {
  if (!Array.isArray(categories) || categories.length < 2) {
    return Array.isArray(categories) ? categories : [];
  }

  const watch = categories.find((c) => typeKey(c) === WATCH_TYPE);
  const luxuryWatch = categories.find((c) => typeKey(c) === LUXURY_WATCH_TYPE);
  const handbag = categories.find((c) => typeKey(c) === LUXURY_HANDBAG_TYPE);
  const family = [watch, luxuryWatch, handbag].filter(Boolean);
  if (family.length === 0) return categories;

  // Anchor on Watch when present so Luxury Watch / Handbag tuck under it
  // even if they appeared earlier in the cockpit list.
  const anchor = watch || family[0];
  const anchorIdx = categories.indexOf(anchor);
  const alreadyPinned = family.every((item, i) => categories[anchorIdx + i] === item);
  if (alreadyPinned) return categories;

  const familySet = new Set(family);
  const next = categories.filter((c) => !familySet.has(c));
  let insertAt = 0;
  for (const c of categories) {
    if (c === anchor) break;
    if (!familySet.has(c)) insertAt += 1;
  }
  next.splice(insertAt, 0, ...family);
  return next;
}
