import { query as sql } from "@/lib/db";

/**
 * Per-condition buyback rules.
 *
 * Some devices we will only buy in certain conditions. The first and, so far,
 * only case is the folding Galaxies: the inner folding screen wears with
 * normal use, fails months after a sale rather than on arrival, and comes
 * bonded to the hinge in the most expensive repair Samsung does. That means a
 * used one cannot be warrantied on resale, so it is declined at any price
 * while a sealed one is bought at a strong one.
 *
 * This lives in the GLOBAL settings row (`pricing.cockpit_settings` where
 * id = 1, exposed as `calc.public_settings`) rather than per-site, because it
 * is a fact about what the business will buy and not a storefront preference.
 * A used Z Fold is unbuyable whichever storefront the seller came through, so
 * every tenant inherits the rule, including ones added later such as
 * epicdeals.
 *
 * Shape, under `settings->'buyback_strategy'->'condition_rules'`:
 *
 *   [{ "match":  ["z fold", "z flip"],       // case-insensitive substrings
 *      "exclude": ["Mint", "Good", "Poor"],  // conditions never offered
 *      "notice":  "We buy folding Galaxies sealed and unopened only. ..." }]
 *
 * `poor_model_exclusions` is the older, narrower mechanism that could only
 * ever drop the "Poor" condition. It is still honoured so nothing that
 * depends on it changes, and the two compose.
 */

const CACHE_TTL_MS = 30_000;

let cached = null;
let cachedAt = 0;

/** Reads both mechanisms from the single global settings row. */
export async function loadConditionRules() {
  const now = Date.now();
  if (cached && now - cachedAt < CACHE_TTL_MS) return cached;

  const { rows } = await sql(
    "select poor_model_exclusions, condition_rules from calc.public_settings limit 1"
  );

  const settings = rows[0] || {};
  cached = {
    poorExclusions: (settings.poor_model_exclusions || []).map((s) =>
      String(s).toLowerCase()
    ),
    rules: (settings.condition_rules || []).map((rule) => ({
      match: (rule.match || []).map((s) => String(s).toLowerCase()),
      exclude: rule.exclude || [],
      notice: rule.notice || null,
    })),
  };
  cachedAt = now;
  return cached;
}

/**
 * Which conditions are unavailable for a model, and why.
 *
 * Returns the set of excluded condition names plus the first notice that
 * applies, so a caller can both filter and explain. Explaining matters: a
 * seller who picks a Z Fold and simply finds "Good" missing will assume the
 * site is broken. Telling them we only buy these sealed, and why, is the
 * difference between a dead end and an answer.
 */
export async function excludedConditionsFor(model) {
  const { poorExclusions, rules } = await loadConditionRules();
  const modelLower = String(model || "").toLowerCase();

  const excluded = new Set();
  let notice = null;

  if (poorExclusions.some((needle) => modelLower.includes(needle))) {
    excluded.add("Poor");
  }

  for (const rule of rules) {
    if (!rule.match.some((needle) => modelLower.includes(needle))) continue;
    for (const condition of rule.exclude) excluded.add(condition);
    if (!notice && rule.notice) notice = rule.notice;
  }

  return { excluded, notice };
}

/**
 * Synchronous variant for callers that have already loaded the rules and are
 * looping over many models, so the settings row is read once per request
 * rather than once per model.
 */
export function excludedConditionsWith({ poorExclusions, rules }, model) {
  const modelLower = String(model || "").toLowerCase();
  const excluded = new Set();
  let notice = null;

  if (poorExclusions.some((needle) => modelLower.includes(needle))) {
    excluded.add("Poor");
  }
  for (const rule of rules) {
    if (!rule.match.some((needle) => modelLower.includes(needle))) continue;
    for (const condition of rule.exclude) excluded.add(condition);
    if (!notice && rule.notice) notice = rule.notice;
  }
  return { excluded, notice };
}
