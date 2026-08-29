// Recomputes the price of every item in a lead server-side from the real
// database, instead of trusting whatever numbers the browser POSTs. A
// customer editing the request in dev tools (or a bot) cannot get a payout
// higher than what the catalogue and pricing settings actually support.
//
// Never hard-blocks a submission on a mismatch -- flags it into
// `pricing_flags` / `needs_pricing_review` on the lead row instead, so ops
// can review, matching the app's existing "never leave the customer stuck"
// approach. The one exception is a confirmed AI decline (see below): that
// item is zeroed out server-side no matter what the client sends, because a
// "we can't buy this" verdict is a decision about whether to buy at all, not
// a price to negotiate.
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
import { notBlockedSql } from "@/lib/catalogGate";

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

  const [entryRes, settingsRes, proposalRes, extraRes] = await Promise.all([
    entryIds.length
      ? query(
          `select entry_id, brand, type, model, capacity, condition, buy_price
           from calc.buy_prices_public bp
           where entry_id = any($1::bigint[]) and brand ilike any($2)
             and ${notBlockedSql("bp", "$3")}`,
          [entryIds, site.where.brand, site.key]
        )
      : Promise.resolve({ rows: [] }),
    query(
      `select consignment_pct, voucher_pct, accessory_bonus, condition_faults, ai_deduction_categories
       from calc.public_settings limit 1`
    ),
    quoteRef
      ? query(
          `select id, category, model, capacity, fault_key, fault_label, proposed_deduction, declined
           from calc.ai_fault_proposals
           where quote_ref = $1 and created_at >= now() - interval '7 days'`,
          [quoteRef]
        )
      : query(
          `select id, category, model, capacity, fault_key, fault_label, proposed_deduction, declined
           from calc.ai_fault_proposals
           where created_at >= now() - interval '24 hours' and model = any($1::text[])`,
          [modelLabels]
        ),
    quoteRef
      ? query(
          `select id, category, model, capacity, extra_key, extra_label, estimated_value
           from calc.ai_extra_estimates
           where quote_ref = $1 and created_at >= now() - interval '7 days'`,
          [quoteRef]
        )
      : query(
          `select id, category, model, capacity, extra_key, extra_label, estimated_value
           from calc.ai_extra_estimates
           where created_at >= now() - interval '24 hours' and model = any($1::text[])`,
          [modelLabels]
        ),
  ]);

  const settings = settingsRes.rows[0] || {};
  const aiCategories = settings.ai_deduction_categories || [];
  const conditionFaults = settings.condition_faults || {};
  const accessoryBonus = settings.accessory_bonus || {};
  const usedProposalIds = new Set();
  const usedExtraIds = new Set();

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

    // The catalogue's brand for this exact device, carried onto the validated
    // item so the Airtable sync has one brand to write. It cannot use the
    // site's brand_filter for this: that's a list (sellyourconsole carries
    // six) and handing the list to Airtable's single-select "Device Brand
    // (Select)" is what 422'd every lead write from 23 Aug onwards.
    let catalogBrand = row?.brand || null;

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

    // AI-proposed faults are matched against real proposals from this
    // session. A matched proposal that the AI flagged `declined` means the
    // damage described has no realistic repair or resale path (see the
    // prompt in /api/fault-price) -- that verdict travels with the item
    // regardless of what the client's payload otherwise claims.
    let itemDeclined = false;
    const declineReasons = [];
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
        aiProposedFaults.push({ ...f, deduction: Math.round(Number(f.deduction)), decline: Boolean(match.declined) });
        aiTotal += Math.round(Number(f.deduction));
        if (match.declined) {
          itemDeclined = true;
          declineReasons.push(f.key);
        }
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

    // A fault the catalogue marks `decline` is a business rule, not a price.
    //
    // The calculator disables Continue the moment one is ticked, but that is
    // browser-side only. Until now nothing server-side read the flag: a
    // replayed or hand-built payload carrying a declined fault was priced and
    // paid like any other. That was harmless while no decline rule existed --
    // the locked-device question was removed before it ever shipped -- and
    // stops being harmless with liquid damage, which is the first live one.
    //
    // Checked across all three lists because a decline rule carries no
    // deduction, so which list it lands in depends on how the client
    // classified it, and a payload we do not trust chose that classification.
    for (const f of [
      ...(item.appliedFaults || []),
      ...(item.pendingReviewFaults || []),
      ...(item.aiProposedFaults || []),
    ]) {
      if (!rules.find((r) => r.key === f.key)?.decline) continue;
      itemDeclined = true;
      if (!declineReasons.includes(f.key)) declineReasons.push(f.key);
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
          `select buy_price, brand from calc.buy_prices_public bp
           where brand ilike any($1) and type = $2 and model = $3
             and coalesce(capacity, 'N/A') = $4 and condition = 'Poor'
             and ${notBlockedSql("bp", "$5")}
           limit 1`,
          [site.where.brand, item.categoryType, item.modelKey, normCap(item.capacity), site.key]
        );
        basePrice = poorRows.length ? Number(poorRows[0].buy_price) : 0;
        if (poorRows.length) catalogBrand = catalogBrand || poorRows[0].brand || null;
        flag(`good_price_denied_unconfirmed:${item.modelKey}`, true);
      }
    } else {
      const { rows: fb } = await query(
        `select buy_price, brand from calc.buy_prices_public bp
         where brand ilike any($1) and type = $2 and model = $3
           and coalesce(capacity, 'N/A') = $4 and condition = $5
           and ${notBlockedSql("bp", "$6")}
         limit 1`,
        [site.where.brand, item.categoryType, item.modelKey, normCap(item.capacity), item.condition, site.key]
      );
      if (fb.length) {
        basePrice = Number(fb[0].buy_price);
        catalogBrand = catalogBrand || fb[0].brand || null;
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

    // Extras (extra controller, Apple Pencil, dock, bands) are priced live by
    // /api/extra-price rather than from a table, so they are checked the same
    // way AI faults are: against a real estimate from this session.
    //
    // An unverified extra keeps the customer's figure rather than being dropped.
    // Dropping it would quietly quote them LESS than the screen promised, which
    // is the one failure this revalidation must never introduce. It is flagged
    // for review instead, because unlike a fault deduction an unverified extra
    // pushes the payout up.
    const extras = [];
    let extrasTotal = 0;
    for (const x of item.extras || []) {
      const claimed = Math.round(Number(x.value)) || 0;
      if (claimed <= 0) {
        extras.push({ ...x, value: 0 });
        continue;
      }
      const match = extraRes.rows.find(
        (e) =>
          !usedExtraIds.has(e.id) &&
          e.category === item.categoryType &&
          e.model === item.model &&
          normCap(e.capacity) === normCap(item.capacity) &&
          e.extra_key === x.key &&
          Math.round(Number(e.estimated_value)) === claimed
      );
      if (match) {
        usedExtraIds.add(match.id);
        extras.push({ ...x, value: claimed });
      } else {
        flag(`extra_unverified:${x.key}`, true);
        extras.push({ ...x, value: claimed, unverified: true });
      }
      extrasTotal += claimed;
    }

    let itemContribution = Math.max(0, basePrice + accessoryBonusTotal + extrasTotal - fixedTotal - aiTotal);
    if (itemDeclined) {
      // A confirmed decline overrides everything else about this item's price.
      // Not a mismatch to review, a business decision already made: we don't
      // buy it in this condition. Zeroed regardless of what the client sent.
      // Recorded in pricing_flags so a R0 line item has an explanation, but
      // deliberately NOT marked for review -- declining is the answer, not a
      // question for ops.
      flag(`item_declined:${item.modelKey}:${declineReasons.join(",")}`);
      itemContribution = 0;
    }
    subtotal += itemContribution;
    validatedItems.push({
      ...item,
      brand: catalogBrand,
      price: basePrice,
      clientPrice: claimedPrice,
      accessories,
      accessoryBonusTotal,
      extras,
      extrasTotalValue: extrasTotal,
      appliedFaults,
      faultDeductionTotal: fixedTotal,
      aiProposedFaults,
      aiFaultDeductionTotal: aiTotal,
      declined: itemDeclined,
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
  //
  // A dropped DECLINED proposal is explicitly NOT surfaced. A decline isn't a
  // price we're haggling over, it's an item we don't buy, and the customer
  // dropping it is them doing exactly what they were asked to do. It needs an
  // explicit skip rather than just falling through: a decline carries a
  // full-item-value deduction, so the ordinary omission check below would
  // otherwise flag every single one of them.
  if (quoteRef) {
    for (const p of proposalRes.rows) {
      if (usedProposalIds.has(p.id)) continue;
      if (p.declined) continue;
      if (!(Number(p.proposed_deduction) > 0)) continue;
      flag(`ai_fault_omitted:${p.category}:${p.fault_key}`, true);
    }
  } else if (items.some((i) => aiCategories.includes(i.categoryType) && i.condition === "Poor")) {
    // No session reference on an AI-graded item priced off the "Good" base.
    // Usually a browser that blocks cookies; occasionally someone who stripped
    // it to detach their submission from what the AI actually proposed.
    flag("quote_ref_missing");
  }

  const serverBonusPct =
    paymentPreference === "consignment"
      ? Number(settings.consignment_pct) || 0
      : paymentPreference === "voucher"
      ? Number(settings.voucher_pct) || 0
      : 0;
  const serverTotal = round2(subtotal * (1 + serverBonusPct / 100));

  return { validatedItems, subtotal: round2(subtotal), serverTotal, serverBonusPct, flags: [...new Set(flags)], needsReview };
}
