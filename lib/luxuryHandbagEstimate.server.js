import { query } from "@/lib/db";
import { displayedHandbagEstimate } from "@/lib/luxuryHandbagEstimate";

/**
 * Look up Luxity sell-sample median for a Luxury Handbag model.
 * Returns null when no Luxity-sourced median is available.
 */
export async function lookupHandbagLuxityMedian({ brand, model }) {
  if (!model) return null;
  const { rows } = await query(
    `select luxity_sample_median
       from calc.luxury_handbag_sell_samples_public
      where lower(model) = lower($1)
        and ($2::text is null or lower(brand) = lower($2))
        and luxity_sample_median is not null
      order by case when $2::text is not null and lower(brand) = lower($2) then 0 else 1 end
      limit 1`,
    [model, brand || null]
  );
  const median = rows[0]?.luxity_sample_median;
  const n = Number(median);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Batch lookup for models list: Map of lower(model) -> median.
 */
export async function lookupHandbagLuxityMediansForModels(models) {
  const keys = [...new Set((models || []).map((m) => String(m.model || "").toLowerCase()).filter(Boolean))];
  if (keys.length === 0) return new Map();
  const { rows } = await query(
    `select lower(model) as model_key, max(luxity_sample_median) as luxity_sample_median
       from calc.luxury_handbag_sell_samples_public
      where lower(model) = any($1::text[])
        and luxity_sample_median is not null
      group by lower(model)`,
    [keys]
  );
  return new Map(
    rows.map((r) => [r.model_key, Number(r.luxity_sample_median)])
  );
}

export async function resolveHandbagEstimate({ brand, model }) {
  const median = await lookupHandbagLuxityMedian({ brand, model });
  return {
    luxitySampleMedian: median,
    estimate: displayedHandbagEstimate(median),
  };
}
