import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getSiteConfig } from "@/lib/siteConfig";
import { displayModel } from "@/lib/format";
import { notBlockedSql } from "@/lib/catalogGate";
import { loadConditionRules, excludedConditionsWith } from "@/lib/conditionRules";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const site = await getSiteConfig({
    host: request.headers.get("host"),
    overrideKey: searchParams.get("site"),
  });
  const type = searchParams.get("type");
  if (!type || !site.categories.some((c) => c.type === type)) {
    return NextResponse.json({ error: "Unknown category" }, { status: 400 });
  }

  try {
    // Rows are returned per condition rather than pre-aggregated, so the
    // price range can be computed AFTER dropping conditions we do not buy.
    // Aggregating in SQL first was quietly wrong: a Z Fold advertised "from
    // R2,013", which is its Poor price, on a model we only buy sealed.
    const [{ rows }, rules] = await Promise.all([
      query(
        `select model, max(model_raw) as model_raw, max(brand) as brand, condition,
        min(buy_price) as low, max(buy_price) as high
from calc.buy_prices_public bp
where brand ilike any($1) and type = $2 and ${notBlockedSql("bp", "$3")}
group by model, condition`,
        [site.where.brand, type, site.key]
      ),
      loadConditionRules(),
    ]);

    const byModel = new Map();
    for (const r of rows) {
      const { excluded } = excludedConditionsWith(rules, r.model);
      if (excluded.has(r.condition)) continue;

      const entry = byModel.get(r.model) || {
        model: r.model,
        modelRaw: r.model_raw,
        // Carried so the calculator can offer a brand step before the model
        // list. A single-brand category (every Apple site, and most of Epic
        // Deals) skips that step, so this costs nothing where it is not
        // wanted and saves scrolling where it is: Epic Deals sells coffee
        // machines from eleven makers.
        brand: r.brand,
        fromPrice: Infinity,
        toPrice: -Infinity,
      };
      entry.fromPrice = Math.min(entry.fromPrice, Number(r.low));
      entry.toPrice = Math.max(entry.toPrice, Number(r.high));
      byModel.set(r.model, entry);
    }

    const models = [...byModel.values()]
      // A model with every condition excluded and no sealed stock has no
      // price at all, so it is dropped rather than shown as a dead end.
      .filter((m) => Number.isFinite(m.fromPrice))
      .sort((a, b) => b.toPrice - a.toPrice)
      .map((m) => ({
        model: m.model,
        label: displayModel(m.model, m.modelRaw),
        brand: m.brand,
        fromPrice: m.fromPrice,
        toPrice: m.toPrice,
      }));

    return NextResponse.json({ models });
  } catch (err) {
    console.error("GET /api/models failed", err);
    return NextResponse.json({ error: "Could not load models" }, { status: 500 });
  }
}
