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
  if (!idNumber || !idDocumentPath || !selfiePath || !ageConfirmed || !termsAccepted || !privacyAccepted) {
    return NextResponse.json(
      {
        error:
          "ID number, a copy of your ID/passport, a selfie, and accepting the terms and privacy policy are all required to sell to us",
      },
      { status: 400 }
    );
  }

  // Banking details are needed for EFT and consignment payouts.
  const needsBankDetails = paymentPreference === "eft" || paymentPreference === "consignment";
  if (needsBankDetails && (!bankName || !accountType || !branchCode || !accountNumber)) {
    return NextResponse.json(
      { error: "Bank name, account type, branch code, and account number are required for this payment option" },
      { status: 400 }
    );
  }

  // Rate limit FIRST. Revalidation runs several database queries per item, so
  // doing it before this check would hand an attacker unlimited expensive work
  // for free.
  const ip = getClientIp(request);
  if (isRateLimited(`${site.key}:${ip}`)) {
    return NextResponse.json({ error: "Too many submissions, please try again later" }, { status: 429 });
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
        notes || null,
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

    after(() =>
      syncLeadToAirtable({
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
          paymentBonusPct,
          siteDomain: site.domain,
          airtableSource: site.airtableSource,
          couponCode: coupon?.code ?? null,
          couponBonus: coupon?.bonus ?? null,
        },
        items: validatedItems,
        brand: site.where?.brand || "",
      }).catch((err) => console.error("syncLeadToAirtable unexpected error", err))
    );

    after(() =>
      fetch("https://api.airtable.com/v0/appMB4HF3PkGe2rZd/tblx9AkbkYzo8Cqhu", {
        method: "POST",
        headers: { "Authorization": `Bearer ${process.env.AIRTABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          records: validatedItems.map(device => ({
            fields: {
              "Client First Name": (fullName || '').split(' ')[0] || '',
              "Client Surname": (fullName || '').split(' ').slice(1).join(' ') || '',
              "Client Phone Number": phone || '',
              "Client Email": email || '',
              "Client Street Number and Name": address || '',
              "Client Suburb": suburb || '',
              "Client City": city || '',
              "Client Province": province || '',
              "Collection=Residential?": residentialAddress !== false ? 'Yes' : 'No',
              "Client ID Number": idNumber || '',
              "Bank Name (Client)": bankName || '',
              "Bank Account Number (Client)": accountNumber || '',
              "Bank Account Type (Client)": accountType || '',
              "Client Bank Branch Code": branchCode || '',
              "Source": site.airtableSource || (site.key || '').toUpperCase(),
              "Payment Preference": paymentPreference === 'eft' ? 'Default (EFT)' : (paymentPreference === 'consignment' ? 'Epic Deals Consignment (10% Extra)' : 'Default (EFT)'),
              "Stated Condition": (device.condition || '').charAt(0).toUpperCase() + (device.condition || '').slice(1).toLowerCase(),
              "Stated Device Model (Strict)": device.model || '',
              "Stated Capacity": device.capacity || '',
              "Quoted Value": device.quotedPrice || 0,
              "T's and C's Agreement?": termsAccepted ? 'Yes' : 'No',
              "Privacy Policy Agreement?": privacyAccepted ? 'Yes' : 'No',
              "Legal Owner?": ageConfirmed ? 'Yes' : 'No',
              "Device Model (Text)": validatedItems.map(d => `${d.model || ''} ${d.capacity || ''} (${d.condition || ''})`).join(', '),
              "Website Sent From": site.domain || '',
            }
          }))
        }),
      }).catch((err) => console.error("airtable direct write failed", err))
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
