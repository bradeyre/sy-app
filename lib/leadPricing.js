// Recomputes the price of every item in a lead server-side from the real
// database, instead of trusting whatever numbers the browser POSTs. A
// customer editing the request in dev tools (or a bot) cannot get a payout
// higher than what the catalogue and pricing settings actually support.
//
// Never hard-blocks a submission on a mismatch -- flags it into
// `pricing_flags` / `needs_pricing_review` on the lead row instead, so ops
// can review, matching the app's existing "never leave the customer stuck"
// approach.
//
// Two fault pricing paths, matching how the UI already works:
//  - Fixed faults (`item.appliedFaults`): looked up against the condition_faults
//    table in calc.public_settings and must have a real, non-null `deduction`.
//  - AI-proposed faults (`item.aiProposedFaults`): categories in
//    `ai_deduction_categories` (Phone/Laptop/Console) get a live, per-device
//    deduction from the AI grading flow. Matched against a real row in
//    calc.ai_fault_proposals from the last 24 hours so a client can't invent an
//    AI deduction that was never actually proposed by the server. The window is
//    24h, not 3h, because customers routinely grade a device and then finish the
//    form later; a stale window just produced noise, since an unmatched fault is
//    now flagged rather than silently repriced.
import { query } from "@/lib/db";

const round2 = (n) => Math.round(n * 100) / 100;
const normCap = (c) => c || "N/A";

export async function revalidateLeadPricing({ site, items, paymentPreference, quoteRef }) {
  const flags = [];
  let needsReview = false;
  const flag = (f, review = false) => {
    flags.push(f);
    if (review) needsReview = true;
  };

  const entryIds = [...new Set(items.map((i) => Number(i.entryId)).filter(Number.isFinite))];
  const modelLabels = [...new Set(items.map((i) => String(i.model || "")))];

  const [entryRes, settingsRes, proposalRes] = await Promise.all([
    entryIds.length
      ? query(
          `select entry_id, brand, type, model, capacity, condition, buy_price
           from calc.buy_prices_public
           where entry_id = any($1::bigint[]) and brand ilike any($2)`,
          [entryIds, site.where.brand]
        )
      : Promise.resolve({ rows: [] }),
    query(
      `select consignment_pct, voucher_pct, accessory_bonus, condition_faults, ai_deduction_categories
       from calc.public_settings limit 1`
    ),
    quoteRef
      ? query(
          `select id, category, model, capacity, fault_key, fault_label, proposed_deduction
           from calc.ai_fault_proposals
           where quote_ref = $1 and created_at >= now() - interval '7 days'`,
          [quoteRef]
        )
      : query(
          `select id, category, model, capacity, fault_key, fault_label, proposed_deduction
           from calc.ai_fault_proposals
           where created_at >= now() - interval '24 hours' and model = any($1::text[])`,
          [modelLabels]
        ),
  ]);

  const settings = settingsRes.rows[0] || {};
  const aiCategories = settings.ai_deduction_categories || [];
  const conditionFaults = settings.condition_faults || {};
  const accessoryBonus = settings.accessory_bonus || {};
  const usedProposalIds = new Set();

  const validatedItems = [];
  let subtotal = 0;

  for (const item of items) {
    const claimedPrice = Number(item.price) || 0;
    let row = entryRes.rows.find(
      (r) =>
        Number(r.entry_id) === Number(item.entryId) &&
        r.model === item.modelKey &&
        normCap(r.capacity) === normCap(item.capacity) &&
        r.type === item.categoryType
    );

    const rules = conditionFaults[item.categoryType] || [];
    const appliedFaults = [];
    let fixedTotal = 0;
    for (const f of item.appliedFaults || []) {
      const rule = rules.find((r) => r.key === f.key);
      const real = rule && rule.deduction != null ? Number(rule.deduction) : 0;
      if (!rule || rule.deduction == null) flag(`fixed_fault_unknown:${f.key}`, true);
      else if (Math.round(Number(f.deduction)) !== Math.round(real)) flag(`fixed_fault_mismatch:${f.key}`);
      appliedFaults.push({ ...f, deduction: real });
      fixedTotal += real;
    }

    const aiProposedFaults = [];
    let aiTotal = 0;
    for (const f of item.aiProposedFaults || []) {
      const match = proposalRes.rows.find(
        (p) =>
          !usedProposalIds.has(p.id) &&
          p.category === item.categoryType &&
          p.model === item.model &&
          normCap(p.capacity) === normCap(item.capacity) &&
          p.fault_key === f.key &&
          p.fault_label === f.label &&
          Math.round(Number(p.proposed_deduction)) === Math.round(Number(f.deduction))
      );
      if (match) {
        usedProposalIds.add(match.id);
        aiProposedFaults.push({ ...f, deduction: Math.round(Number(f.deduction)) });
        aiTotal += Math.round(Number(f.deduction));
      } else {
        // No live proposal backs this fault. Do NOT zero it: the customer
        // already accepted this deduction, and dropping it would push the
        // payout up. Keep their figure and flag the lead for review.
        const claimed = Math.round(Number(f.deduction)) || 0;
        flag(`ai_fault_unmatched:${f.key}`, true);
        aiProposedFaults.push({ ...f, deduction: claimed, unverified: true });
        aiTotal += claimed;
      }
    }

    const hasAnyFault =
      appliedFaults.length > 0 || aiProposedFaults.length > 0 || (item.pendingReviewFaults || []).length > 0;

    let basePrice;
    if (row && row.condition === item.condition) {
      basePrice = Number(row.buy_price);
    } else if (
      row &&
      row.condition === "Good" &&
      item.condition === "Poor" &&
      aiCategories.includes(item.categoryType) &&
      hasAnyFault
    ) {
      if (fixedTotal + aiTotal > 0) {
        basePrice = Number(row.buy_price);
      } else {
        const { rows: poorRows } = await query(
          `select buy_price from calc.buy_prices_public
           where brand ilike any($1) and type = $2 and model = $3
             and coalesce(capacity, 'N/A') = $4 and condition = 'Poor'
           limit 1`,
          [site.where.brand, item.categoryType, item.modelKey, normCap(item.capacity)]
        );
        basePrice = poorRows.length ? Number(poorRows[0].buy_price) : 0;
        flag(`good_price_denied_unconfirmed:${item.modelKey}`, true);
      }
    } else {
      const { rows: fb } = await query(
        `select buy_price from calc.buy_prices_public
         where brand ilike any($1) and type = $2 and model = $3
           and coalesce(capacity, 'N/A') = $4 and condition = $5
         limit 1`,
        [site.where.brand, item.categoryType, item.modelKey, normCap(item.capacity), item.condition]
      );
      if (fb.length) {
        basePrice = Number(fb[0].buy_price);
        flag(`entry_id_stale:${item.entryId}`);
      } else {
        basePrice = 0;
        flag(`unpriced_item:${item.modelKey}`, true);
      }
    }
    if (Math.abs(basePrice - claimedPrice) > 1) flag(`price_mismatch:${item.entryId}`);

    const acfg = site.accessoryOptions?.[item.categoryType];
    const bonusTable = (acfg && accessoryBonus[acfg.settingsKey]) || {};
    const accessories = (item.accessories || []).map((a) => ({
      ...a,
      bonus: Number(bonusTable[a.key]) || 0,
    }));
    const accessoryBonusTotal = accessories.reduce((s, a) => s + a.bonus, 0);

    subtotal += Math.max(0, basePrice + accessoryBonusTotal - fixedTotal - aiTotal);
    validatedItems.push({
      ...item,
      price: basePrice,
      clientPrice: claimedPrice,
      accessories,
      accessoryBonusTotal,
      appliedFaults,
      faultDeductionTotal: fixedTotal,
      aiProposedFaults,
      aiFaultDeductionTotal: aiTotal,
    });
  }

  // Everything above validates the faults the customer DECLARED. A customer can
  // also game the quote by deleting a proposed fault from the payload instead of
  // editing its amount -- keeping one trivial R50 deduction is enough to unlock
  // the higher "Good" base price while the expensive fault quietly disappears.
  // Any proposal from this session that no declared fault claimed is surfaced
  // here. Flagged for review only: a customer may legitimately have unticked a
  // fault after the AI priced it, and silently docking them for that would be
  // worse than asking someone to look.
  if (quoteRef) {
    for (const p of proposalRes.rows) {
      if (usedProposalIds.has(p.id)) continue;
      if (!(Number(p.proposed_deduction) > 0)) continue;
      flag(`ai_fault_omitted:${p.category}:${p.fault_key}`, true);
    }
  } else if (items.some((i) => aiCategories.includes(i.categoryType) && i.condition === "Poor")) {
    // No session reference on an AI-graded item priced off the "Good" base.
    // Usually a browser that blocks cookies; occasionally someone who stripped
    // it to detach their submission from what the AI actually proposed.
    flag("quote_ref_missing", true);
  }

  const serverBonusPct =
    paymentPreference === "consignment"
      ? Number(settings.consignment_pct) || 0
      : paymentPreference === "voucher"
      ? Number(settings.voucher_pct) || 0
      : 0;
  const serverTotal = round2(subtotal * (1 + serverBonusPct / 100));

  return { validatedItems, serverTotal, serverBonusPct, flags: [...new Set(flags)], needsReview };
}
