import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSiteConfig } from "@/lib/siteConfig";
import { notBlockedSql } from "@/lib/catalogGate";
import { excludedConditionsFor } from "@/lib/conditionRules";
import { isLuxuryHandbagCategory } from "@/lib/luxuryHandbagPaymentGate";
import { applyHandbagEstimateToCapacities } from "@/lib/luxuryHandbagEstimate";
import { lookupHandbagLuxityMedian } from "@/lib/luxuryHandbagEstimate.server";

export const dynamic = "force-dynamic";

const CONDITION_ORDER = ["Sealed", "Mint", "Good", "Poor"];

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = await getSiteConfig({
    host: request.headers.get("host"),
    overrideKey: searchParams.get("site"),
  });
  const model = searchParams.get("model");
  if (!model) {
    return NextResponse.json({ error: "model is required" }, { status: 400 });
  }

  try {
    const [{ rows }, { excluded, notice }] = await Promise.all([
      query(
        `select entry_id, capacity, condition, buy_price, type, brand
from calc.buy_prices_public bp
where brand ilike any($1) and model = $2 and ${notBlockedSql("bp", "$3")}
order by capacity, condition`,
        [site.where.brand, model, site.key]
      ),
      excludedConditionsFor(model),
    ]);

    // Conditions we do not buy this model in are dropped rather than shown
    // and then refused later. `notice` explains why, and is returned even
    // when nothing was dropped for this particular capacity, because the
    // seller still needs to know before choosing.
    const filteredRows = rows.filter((r) => !excluded.has(r.condition));
    const categoryType = filteredRows[0]?.type || null;
    const brand = filteredRows[0]?.brand || null;

    const byCapacity = {};
    for (const r of filteredRows) {
      const cap = r.capacity || "N/A";
      byCapacity[cap] ||= [];
      byCapacity[cap].push({
        entryId: r.entry_id,
        condition: r.condition,
        conditionLabel: site.conditionLabels[r.condition] || r.condition,
        price: Number(r.buy_price),
      });
    }

    let capacities = Object.keys(byCapacity).map((cap) => ({
      capacity: cap,
      conditions: byCapacity[cap].sort(
        (a, b) =>
          CONDITION_ORDER.indexOf(a.condition) - CONDITION_ORDER.indexOf(b.condition)
      ),
    }));

    let pricingMode = "firm";
    let estimate = null;
    let luxitySampleMedian = null;

    if (isLuxuryHandbagCategory(categoryType)) {
      luxitySampleMedian = await lookupHandbagLuxityMedian({ brand, model });
      const applied = applyHandbagEstimateToCapacities(
        categoryType,
        capacities,
        luxitySampleMedian
      );
      capacities = applied.capacities;
      pricingMode = applied.pricingMode;
      estimate = applied.estimate;
    }

    return NextResponse.json({
      capacities,
      notice: notice || null,
      categoryType,
      pricingMode,
      estimate,
      luxitySampleMedian,
    });
  } catch (err) {
    console.error("GET /api/quote failed", err);
    return NextResponse.json({ error: "Could not load quote" }, { status: 500 });
  }
}
