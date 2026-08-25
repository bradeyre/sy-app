// One definition of "this device is switched off for this site".
//
// The buyback catalogue is gated at three levels, and each level has exactly one
// mechanism:
//   category -> pricing.site_catalog.category_filter  (drives site.categories)
//   brand    -> pricing.site_catalog.brand_filter     (drives site.where.brand)
//   model    -> calc.buyback_model_blocks             (this file)
//
// All three are edited from the Pricing Cockpit's "Niche sites" page.
//
// Deliberately a NOT EXISTS rather than a helper function: a STABLE function
// that queries a table gets re-evaluated once per scanned row when used in a
// WHERE over another table, which is a known cause of production timeouts in
// this database. A semi-join is planned once.
//
// `alias` and `siteParam` are developer-supplied literals, never user input.
export function notBlockedSql(alias, siteParam) {
  return `not exists (
      select 1 from calc.buyback_model_blocks bb
      where lower(bb.model) = lower(${alias}.model)
        and (bb.site_key is null or bb.site_key = ${siteParam})
        and (bb.type is null or bb.type = ${alias}.type)
    )`;
}
