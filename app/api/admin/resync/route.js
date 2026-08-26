import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { syncLeadToAirtable } from "@/lib/airtable";

export const dynamic = "force-dynamic";

// TEMPORARY, DELETE AFTER USE.
//
// Second and final pass of the Aug 2026 recovery. These four leads DID reach
// Airtable, but only via the cron bridge, which wrote them repeatedly, with the
// wrong quoted value, no brand and no attachments. Once the bridge's records
// are deleted, this replays the stored lead and stored items through the normal
// syncLeadToAirtable path so they end up identical to a live submission.
//
// Guarded as before, because this repo is public: only these lead ids, and the
// caller has to already know each lead's exact stored phone number.
const RECOVERABLE = new Set([67, 69, 71, 72]);

export async function POST(request) {
  const body = await request.json().catch(() => null);
  const asked = Array.isArray(body?.leads) ? body.leads : [];
  if (asked.length === 0) return NextResponse.json({ error: "no leads" }, { status: 400 });

  const { rows: sites } = await query(
    "select site_key, domain, airtable_source, brand_filter from calc.site_config"
  );
  const siteBy = Object.fromEntries(sites.map((s) => [s.site_key, s]));
  const results = [];

  for (const asking of asked) {
    const id = Number(asking?.id);
    if (!RECOVERABLE.has(id)) {
      results.push({ id, ok: false, error: "not recoverable" });
      continue;
    }
    const { rows } = await query("select * from calc.leads where id = $1", [id]);
    const lead = rows[0];
    if (!lead) {
      results.push({ id, ok: false, error: "not found" });
      continue;
    }
    if (String(lead.phone || "") !== String(asking?.phone || "")) {
      results.push({ id, ok: false, error: "phone mismatch" });
      continue;
    }
    const site = siteBy[lead.site];
    if (!site) {
      results.push({ id, ok: false, error: `unknown site ${lead.site}` });
      continue;
    }

    const items = [];
    for (const item of lead.items || []) {
      const { rows: byEntry } = await query(
        "select brand from calc.buy_prices_public where entry_id = $1 limit 1",
        [Number(item.entryId)]
      );
      let brand = byEntry[0]?.brand || null;
      if (!brand) {
        const { rows: byModel } = await query(
          "select brand from calc.buy_prices_public where type = $1 and model = $2 limit 1",
          [item.categoryType, item.modelKey]
        );
        brand = byModel[0]?.brand || null;
      }
      items.push({ ...item, brand });
    }

    try {
      await syncLeadToAirtable({
        lead: {
          fullName: lead.full_name,
          phone: lead.phone,
          email: lead.email,
          address: lead.address,
          suburb: lead.suburb,
          city: lead.city,
          province: lead.province,
          residentialAddress: lead.residential_address !== false,
          preferredCollectionDate: lead.preferred_collection_date,
          idNumber: lead.id_number,
          idDocumentPath: lead.id_document_path,
          selfiePath: lead.selfie_path,
          ageConfirmed: Boolean(lead.age_confirmed),
          termsAccepted: Boolean(lead.terms_accepted),
          privacyAccepted: Boolean(lead.privacy_accepted),
          bankName: lead.bank_name,
          accountType: lead.account_type,
          branchCode: lead.branch_code,
          accountNumber: lead.account_number,
          paymentPreference: lead.payment_preference,
          paymentBonusPct: lead.payment_bonus_pct,
          siteDomain: site.domain,
          airtableSource: site.airtable_source,
          couponCode: lead.coupon_code ?? null,
          couponBonus: lead.coupon_bonus ?? null,
        },
        items,
        brand: site.brand_filter || [],
      });
      results.push({ id, ok: true, items: items.length, brands: items.map((i) => i.brand) });
    } catch (err) {
      results.push({ id, ok: false, error: String(err.message || err).slice(0, 300) });
    }
  }

  return NextResponse.json({ results });
}
