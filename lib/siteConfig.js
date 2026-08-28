import { query as sql } from "@/lib/db";

/**
 * Multi-tenant site configuration.
 *
 * Every tenant setting now lives in one row of `pricing.site_catalog`,
 * exposed through the `calc.site_config` view (which filters to
 * `active = true`). Adding a storefront is a database row and nothing else.
 *
 * It used to be split. Brand and category filters were in the database
 * while `accessoryOptions`, `extraAccessoryOptions` and `airtableSource`
 * sat in a hardcoded SITES object here, keyed by site_key. That split was
 * not merely untidy: on 2026-08-25 sellyouriphone was activated in the
 * database, correctly served six Apple categories, and silently offered no
 * accessory options on five of them, because half of the tenant lived
 * somewhere the database could not see. A seller with a MacBook was quietly
 * offered up to R160 less than the same person on sellyourmac. Nothing
 * errored, so nothing surfaced it.
 *
 * If you are tempted to add a per-site constant to this file: add a column
 * instead.
 */

/*
 * There is deliberately no brand-colour constant here any more.
 *
 * It used to be `const BRAND_COLOUR = "#00a2ff"` with the comment "Every
 * buyback storefront uses the group blue", exposed on every site as
 * `brandColor`. Two things were wrong with it: nothing ever read the field,
 * and the claim was false -- sellyourmac.co.za ships #3b82f6, synthesized
 * from the reference its redesign was pinned to.
 *
 * Accent now lives in app/globals.css, keyed off `data-site`, which is the
 * only place that can serve both themes and all five tenants from one
 * stylesheet. Do not reintroduce a colour constant here.
 */

/** Fallback tenant when a request matches no domain and names no site. */
const DEFAULT_SITE_KEY = "sellyourmac";

/** Condition labels every site inherits unless its row overrides one. */
const DEFAULT_CONDITION_LABELS = {
  Sealed: "New / Sealed",
  Mint: "Excellent",
  Good: "Good, works fully",
  Poor: "Heavily used / faulty",
};

const CACHE_TTL_MS = 30_000;

let cachedRows = null;
let cachedAt = 0;

async function loadSites() {
  const now = Date.now();
  if (cachedRows && now - cachedAt < CACHE_TTL_MS) return cachedRows;

  const { rows } = await sql(
    `select site_key, domain, display_name, brand_filter, category_filter,
            category_labels, condition_labels, accessory_options,
            extra_accessory_options, airtable_source
       from calc.site_config`
  );

  cachedRows = rows;
  cachedAt = now;
  return rows;
}

function shape(row) {
  const categories = (row.category_filter || []).map((type) => ({
    type,
    label: row.category_labels?.[type] || type,
  }));

  return {
    key: row.site_key,
    siteName: row.display_name,
    domain: row.domain,
    /**
     * Falls back to the uppercased key rather than throwing, so a tenant
     * added without a source tag still records leads under something
     * recognisable instead of losing them.
     */
    airtableSource: row.airtable_source || row.site_key.toUpperCase(),
    where: { brand: row.brand_filter || [] },
    conditionLabels: { ...DEFAULT_CONDITION_LABELS, ...(row.condition_labels || {}) },
    categories,
    accessoryOptions: row.accessory_options || {},
    extraAccessoryOptions: row.extra_accessory_options || {},
  };
}

/**
 * Resolve the tenant for a request.
 *
 * Host first, so each storefront's own domain serves its own catalogue.
 * `overrideKey` is the `?site=` parameter, which is how the niche sites
 * frame the calculator in an iframe from their own domain.
 */
export async function getSiteConfig({ host, overrideKey } = {}) {
  const sites = await loadSites();
  if (!sites.length) throw new Error("calc.site_config returned no active sites");

  const hostname = (host || "").toLowerCase().split(":")[0];

  let match = sites.find((s) => s.domain?.toLowerCase() === hostname);
  if (!match && overrideKey) match = sites.find((s) => s.site_key === overrideKey);
  if (!match) match = sites.find((s) => s.site_key === DEFAULT_SITE_KEY) || sites[0];

  return shape(match);
}
