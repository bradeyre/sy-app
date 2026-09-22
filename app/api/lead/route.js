import { NextResponse } from "next/server";
import { after } from "next/server";
import { query } from "@/lib/db";
import { getSiteConfig } from "@/lib/siteConfig";
import { isRateLimited } from "@/lib/rateLimit";
import { syncLeadToAirtable } from "@/lib/airtable";
import { getClientIp } from "@/lib/clientIp";
import { readQuoteRef, newQuoteRef } from "@/lib/quoteRef";
import { evaluateCoupon, claimCouponUse, releaseCouponUse, recordRedemption } from "@/lib/coupons";
import { revalidateLeadPricing } from "@/lib/leadPricing";
import { isCashPayoutPreference } from "@/lib/luxuryWatchPaymentGate";
import { catalogLuxuryWatchCashPayoutBlocked } from "@/lib/luxuryWatchPaymentGate.server";
import { catalogLuxuryHandbagCashPayoutBlocked } from "@/lib/luxuryHandbagPaymentGate.server";
import {
  appendHandbagMissNotes,
  cartHasHandbagMiss,
  payloadBlocksHandbagMissCashPayout,
  sanitizeHandbagMissItems,
  validateHandbagMissLead,
} from "@/lib/luxuryHandbagMiss";
import { sendHandbagMissCustomerEmail, sendHandbagMissOpsEmail } from "@/lib/email";
import { createSignedReadUrl, downloadStoredObject } from "@/lib/storage";
import { validateLeadIdentityAndBank } from "@/lib/leadValidation";

export const dynamic = "force-dynamic";

export async function POST(request) {
  const site = await getSiteConfig({
    host: request.headers.get("host"),
    overrideKey: new URL(request.url).searchParams.get("site"),
  });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    items,
    quotedTotal,
    paymentPreference,
    paymentBonusPct,
    fullName,
    phone,
    email,
    address,
    suburb,
    city,
    province,
    postalCode,
    residentialAddress,
    preferredCollectionDate,
    notes,
    idNumber,
    idDocumentPath,
    selfiePath,
    ageConfirmed,
    termsAccepted,
    privacyAccepted,
    bankName,
    accountType,
    branchCode,
    accountNumber,
    couponCode,
    authenticityAccepted,
    website, // honeypot, real users never see or fill this field
    renderedAt, // client timestamp (ms) from when the form was shown
  } = body || {};

  if (!fullName || !phone || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Second-Hand Goods Act 6 of 2009 (s2) requires an ID/passport number, a
  // copy of the ID document, and that the seller isn't a minor, captured per
  // transaction, plus a selfie, terms acceptance, and privacy acceptance
  // (matched live against epicdeals.co.za/trade-in).
  // Banking is required for EFT/consignment except Luxury Handbag miss-flow
  // (quote emailed; no EFT payout), where bank fields are optional.
  const identityAndBank = validateLeadIdentityAndBank({
    items,
    paymentPreference,
    idNumber,
    idDocumentPath,
    selfiePath,
    ageConfirmed,
    termsAccepted,
    privacyAccepted,
    bankName,
    accountType,
    branchCode,
    accountNumber,
  });
  if (!identityAndBank.ok) {
    return NextResponse.json({ error: identityAndBank.error }, { status: 400 });
  }

  // Rate limit FIRST. Revalidation runs several database queries per item, so
  // doing it before this check would hand an attacker unlimited expensive work
  // for free.
  const ip = getClientIp(request);
  if (isRateLimited(`${site.key}:${ip}`)) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
  }

  // Luxury watches (Good cash buy ≥ R10k, excluding Apple/Samsung/Huawei)
  // may only take consignment or voucher. Checked against the catalogue so
  // a crafted payload cannot pick Direct EFT. Lookup failure is fail-open
  // so a database hiccup does not block a real seller; the UI already hid
  // EFT for the same rule.
  let luxuryWatchCashBlocked = false;
  try {
    luxuryWatchCashBlocked = await catalogLuxuryWatchCashPayoutBlocked({ site, items });
  } catch (err) {
    console.error("luxury watch cash gate lookup failed", err);
  }
  if (luxuryWatchCashBlocked && isCashPayoutPreference(paymentPreference)) {
    return NextResponse.json(
      {
        error:
          "This watch does not qualify for instant EFT payout. Please choose Consignment or an Epic Deals voucher.",
      },
      { status: 400 }
    );
  }

  // Luxury handbags may only take consignment or voucher — no Direct EFT,
  // regardless of Good cash buy. Catalogue type decides, not the payload.
  // Lookup failure is fail-open; the UI already hid EFT for the same rule.
  let luxuryHandbagCashBlocked = false;
  try {
    luxuryHandbagCashBlocked = await catalogLuxuryHandbagCashPayoutBlocked({ site, items });
  } catch (err) {
    console.error("luxury handbag cash gate lookup failed", err);
  }
  const missCashBlocked = payloadBlocksHandbagMissCashPayout(items, paymentPreference);
  if ((luxuryHandbagCashBlocked || missCashBlocked) && isCashPayoutPreference(paymentPreference)) {
    return NextResponse.json(
      {
        error:
          "Luxury handbags do not qualify for instant EFT payout. Please choose Consignment or an Epic Deals voucher.",
      },
      { status: 400 }
    );
  }

  if (cartHasHandbagMiss(items)) {
    const missCheck = validateHandbagMissLead({
      items,
      paymentPreference,
      authenticityAccepted,
      email,
    });
    if (!missCheck.ok) {
      return NextResponse.json(
        { error: missCheck.errors[0] || "Handbag quote details are incomplete" },
        { status: 400 }
      );
    }
  }

  // Recompute prices and fault deductions from the real database instead of
  // trusting whatever the browser sent. Never blocks the submission on a
  // mismatch -- flags it for review instead.
  //
  // Guarded: if revalidation itself fails (database hiccup, timeout), we fall
  // back to storing the client's figures and flag the lead. Losing a real
  // customer's submission is worse than storing one unverified quote.
  // The reference the browser has been carrying since the AI first priced a
  // fault. It binds this submission to the proposals actually made to THIS
  // customer, rather than to every proposal for the same device model. A lead
  // that never triggered AI grading has none, so it gets a fresh one purely as
  // a customer-facing reference.
  const sessionQuoteRef = readQuoteRef(request);
  const reference = sessionQuoteRef || newQuoteRef(site.airtableSource);

  let validatedItems = items;
  let serverSubtotal = null;
  let serverTotal = quotedTotal ?? null;
  let serverBonusPct = paymentBonusPct ?? null;
  let flags = [];
  let needsReview = false;
  try {
    const revalidated = await revalidateLeadPricing({ site, items, paymentPreference, quoteRef: sessionQuoteRef });
    validatedItems = revalidated.validatedItems;
    serverSubtotal = revalidated.subtotal;
    serverTotal = revalidated.serverTotal;
    serverBonusPct = revalidated.serverBonusPct;
    flags = revalidated.flags;
    needsReview = revalidated.needsReview;
  } catch (err) {
    console.error("revalidateLeadPricing failed, storing client figures", err);
    flags = ["pricing_revalidation_failed"];
    needsReview = true;
  }

  if (cartHasHandbagMiss(validatedItems) || cartHasHandbagMiss(items)) {
    validatedItems = sanitizeHandbagMissItems(validatedItems);
    flags = [...new Set([...flags, "handbag_miss_quote"])];
    needsReview = true;
    // Miss-flow never invents a cash estimate for the bag lines.
    if (validatedItems.every((item) => item.missFlow || item.estimateUnavailable)) {
      serverSubtotal = 0;
      serverTotal = 0;
    }
  }

  const notesWithMiss = appendHandbagMissNotes(notes, validatedItems);

  const honeypotTriggered = Boolean(website);
  const filledInMs = renderedAt ? Date.now() - Number(renderedAt) : null;
  const tooFast = filledInMs !== null && filledInMs < 3000; // under 3s = almost certainly a bot
  const isSpam = honeypotTriggered || tooFast;

  let coupon = null;
  if (couponCode && serverSubtotal != null && !isSpam) {
    try {
      const evaluated = await evaluateCoupon({
        code: couponCode,
        siteKey: site.key,
        subtotal: serverSubtotal,
        // The server's own count of the devices it actually priced, never the
        // browser's, so a per-device coupon can't be told there were ten.
        itemCount: validatedItems.length,
      });
      if (evaluated.ok) {
        // Claim the use before the lead is written, so a limited-run code can
        // never be handed out more times than it allows.
        if (await claimCouponUse(evaluated.couponId)) {
          coupon = evaluated;
          serverTotal = Math.round((Number(serverTotal) + evaluated.bonus) * 100) / 100;
        } else {
          flags = [...flags, "coupon_exhausted"];
        }
      } else {
        flags = [...flags, "coupon_rejected"];
      }
    } catch (err) {
      console.error("coupon evaluation failed", err);
      flags = [...flags, "coupon_check_failed"];
      needsReview = true;
    }
  }

  try {
    const { rows } = await query(
      `insert into calc.leads
        (site, status, items, quoted_total, full_name, phone, email, address, suburb, city,
         province, postal_code, residential_address,
         preferred_collection_date, notes, ip_address, user_agent, honeypot_triggered, source_url,
         id_number, id_document_path, selfie_path, age_confirmed, id_verification_method,
         terms_accepted, privacy_accepted,
         bank_name, account_type, branch_code, account_number,
         payment_preference, payment_bonus_pct,
         client_quoted_total, pricing_flags, needs_pricing_review, quote_ref,
         coupon_code, coupon_bonus)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38)
       returning id`,
      [
        site.key,
        isSpam ? "spam" : "new",
        JSON.stringify(validatedItems),
        serverTotal,
        fullName,
        phone,
        email || null,
        address || null,
        suburb || null,
        city || null,
        province || null,
        postalCode || null,
        residentialAddress === false ? false : true,
        preferredCollectionDate || null,
        notesWithMiss || null,
        ip !== "unknown" ? ip : null,
        request.headers.get("user-agent") || null,
        honeypotTriggered,
        request.headers.get("referer") || null,
        idNumber,
        idDocumentPath,
        selfiePath,
        Boolean(ageConfirmed),
        "uploaded",
        Boolean(termsAccepted),
        Boolean(privacyAccepted),
        bankName || null,
        accountType || null,
        branchCode || null,
        accountNumber || null,
        paymentPreference || null,
        serverBonusPct,
        quotedTotal ?? null,
        JSON.stringify(flags),
        needsReview,
        reference,
        coupon?.code ?? null,
        coupon?.bonus ?? null,
      ]
    );

    if (isSpam) {
      // Don't tip off bots, still return success. No coupon was claimed above.
      return NextResponse.json({ ok: true, id: rows[0].id, reference });
    }

    // n8n owns the customer acknowledgment email; this app's job is just to
    // make sure the Airtable record it writes has the fields that template
    // needs. after() (backed by Vercel's waitUntil) keeps the customer's
    // success screen fast while guaranteeing the sync actually runs to
    // completion instead of racing the response.
    if (coupon) {
      after(() =>
        recordRedemption({
          couponId: coupon.couponId,
          leadId: rows[0].id,
          quoteRef: reference,
          code: coupon.code,
          bonus: coupon.bonus,
        }).catch((err) => console.error("coupon redemption log failed", err))
      );
    }

    if (cartHasHandbagMiss(validatedItems)) {
      after(() =>
        notifyHandbagMiss({
          leadId: rows[0].id,
          reference,
          lead: {
            fullName,
            phone,
            email,
            address,
            suburb,
            city,
            province,
            notes: notesWithMiss,
            paymentPreference,
            quoteRef: reference,
          },
          items: validatedItems,
        }).catch((err) => console.error("handbag miss notify failed", err))
      );
    }

    after(() =>
      syncLeadToAirtable({
        leadId: rows[0].id,
        lead: {
          fullName,
          phone,
          email,
          address,
          suburb,
          city,
          province,
          residentialAddress: residentialAddress !== false,
          preferredCollectionDate,
          notes: notesWithMiss,
          quoteRef: reference,
          idNumber,
          idDocumentPath,
          selfiePath,
          ageConfirmed: Boolean(ageConfirmed),
          termsAccepted: Boolean(termsAccepted),
          privacyAccepted: Boolean(privacyAccepted),
          bankName,
          accountType,
          branchCode,
          accountNumber,
          paymentPreference,
          // Server-validated bonus (revalidateLeadPricing), never the raw
          // client figure. This is what Quoted Value and Payment Preference
          // mapping must use so ops sees the same money the customer saw.
          paymentBonusPct: serverBonusPct,
          siteDomain: site.domain,
          airtableSource: site.airtableSource,
          couponCode: coupon?.code ?? null,
          couponBonus: coupon?.bonus ?? null,
        },
        items: validatedItems,
        brand: site.where?.brand || "",
      }).catch((err) =>
        console.error(
          JSON.stringify({
            event: "airtable_sync_failed",
            leadId: rows[0].id,
            quoteRef: reference,
            error: String(err?.message || err),
          })
        )
      )
    );

    return NextResponse.json({ ok: true, id: rows[0].id, reference });
  } catch (err) {
    console.error("POST /api/lead failed", err);
    if (coupon) {
      await releaseCouponUse(coupon.couponId).catch((releaseErr) =>
        console.error("could not release claimed coupon use", releaseErr)
      );
    }
    return NextResponse.json({ error: "Could not submit lead" }, { status: 500 });
  }
}

const PHOTO_LINK_TTL_SEC = 60 * 60 * 24 * 7;

async function notifyHandbagMiss({ leadId, reference, lead, items }) {
  const missItems = [];
  const attachments = [];

  for (const item of items || []) {
    const photos = [];
    for (const photo of item.handbagPhotos || []) {
      if (!photo?.path) continue;
      let url = null;
      try {
        url = await createSignedReadUrl(photo.path, PHOTO_LINK_TTL_SEC);
      } catch (err) {
        console.error("handbag miss signed url failed", photo.path, err);
      }
      photos.push({ ...photo, url });
      try {
        attachments.push(await downloadStoredObject(photo.path));
      } catch (err) {
        console.error("handbag miss attachment failed", photo.path, err);
      }
    }
    missItems.push({ ...item, handbagPhotos: photos });
  }

  await sendHandbagMissOpsEmail({
    lead: { ...lead, leadId, quoteRef: reference },
    items: missItems,
    attachments,
  });
  await sendHandbagMissCustomerEmail({
    to: lead.email,
    fullName: lead.fullName,
    leadId: reference || leadId,
  });
}
