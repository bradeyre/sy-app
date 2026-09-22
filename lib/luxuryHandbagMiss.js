/**
 * Luxury Handbag Luxity-MISS path (Buyback commercial).
 *
 * When a bag is not in Luxity / has no estimate, or the seller cannot
 * find brand/model, we collect details + photos and email Jarred for a
 * quote. No invented cash figure. Consignment + voucher only.
 *
 * Isomorphic: safe for UI + unit tests. Email send lives in email.js.
 */

import {
  isCashPayoutPreference,
  isLuxuryHandbagCategory,
} from "./luxuryHandbagPaymentGate.js";

export const HANDBAG_MISS_NOTIFY_TO = "jarred@epicdeals.co.za";

export const HANDBAG_MISS_COPY = {
  missEntryCta:
    "Can't find your bag? Add the brand, model, and photos and we'll email you a quote.",
  promise48h: "We'll get back to you within 48 working hours.",
  thankYou: "Got it. Our team will email you a quote within 48 working hours.",
  counterfeitDisclaimer:
    "We only buy authentic bags. Authenticity is your responsibility before you ship. If the bag turns out to be counterfeit, you pay the return courier plus a R799 assessment fee.",
  addPhotos: "Add photos",
  photoTips: "Photo tips",
  fieldBrand: "Brand",
  fieldModel: "Model",
  fieldColour: "Colour or material",
  fieldCondition: "Condition",
  fieldPhotos: "Photos",
  fieldSerial: "Serial / authenticity card notes",
  authHelperUrl: "https://realauthentication.com/",
  authHelperCta: "Optional: Real Authentication pay-per-item check",
  authHelperHint:
    "We do not require this before you submit. It is a paid third-party check if you want one.",
  heicWhatsAppFallback:
    "iPhone HEIC photos won't upload here. Send the photo to yourself on WhatsApp (it converts to JPG), then upload that.",
};

export const HANDBAG_MISS_PHOTO_SHOTS = [
  { key: "front", label: "Front / logo side", required: true },
  { key: "back", label: "Back", required: true },
  { key: "interior", label: "Interior / lining", required: true },
  { key: "hardware", label: "Hardware close-up (zip, clasp, feet)", required: true },
  { key: "serial", label: "Serial, authenticity card, or date code", required: false },
  { key: "wear", label: "Wear, stains, or damage", required: false },
];

export const HANDBAG_MISS_REQUIRED_SHOTS = HANDBAG_MISS_PHOTO_SHOTS.filter((s) => s.required);

export const HANDBAG_MISS_CONDITIONS = [
  { value: "Sealed", label: "New / Sealed" },
  { value: "Mint", label: "Excellent" },
  { value: "Good", label: "Good, works fully" },
  { value: "Poor", label: "Heavily used / faulty" },
];

function trim(value) {
  return String(value ?? "").trim();
}

export function isHandbagMissItem(item) {
  if (!item) return false;
  if (item.missFlow) return true;
  return isLuxuryHandbagCategory(item.categoryType) && Boolean(item.estimateUnavailable);
}

export function cartHasHandbagMiss(items) {
  return (items || []).some(isHandbagMissItem);
}

export function hasRequiredHandbagPhotos(photos) {
  const list = Array.isArray(photos) ? photos : [];
  const byKey = new Map(list.map((p) => [p?.key, p]));
  return HANDBAG_MISS_REQUIRED_SHOTS.every((shot) => {
    const row = byKey.get(shot.key);
    return Boolean(row && trim(row.path));
  });
}

export function payloadBlocksHandbagMissCashPayout(items, paymentPreference) {
  if (!isCashPayoutPreference(paymentPreference)) return false;
  return (items || []).some(
    (item) =>
      isHandbagMissItem(item) ||
      isLuxuryHandbagCategory(item.categoryType)
  );
}

export function sanitizeHandbagMissItems(items) {
  return (items || []).map((item) => {
    if (!isHandbagMissItem(item)) return item;
    return {
      ...item,
      price: 0,
      basePrice: 0,
      missFlow: true,
      estimateUnavailable: true,
      isEstimate: true,
    };
  });
}

/**
 * Server + client contract for a miss-flow submit.
 * Returns `{ ok, missItems, errors }`.
 */
export function validateHandbagMissLead({
  items,
  paymentPreference,
  authenticityAccepted,
  email,
} = {}) {
  const missItems = (items || []).filter(isHandbagMissItem);
  const errors = [];
  if (missItems.length === 0) return { ok: true, missItems, errors };

  if (isCashPayoutPreference(paymentPreference)) {
    errors.push(
      "Luxury handbags do not qualify for instant EFT payout. Please choose Consignment or an Epic Deals voucher."
    );
  }
  if (!authenticityAccepted) {
    errors.push(HANDBAG_MISS_COPY.counterfeitDisclaimer);
  }
  if (!trim(email)) {
    errors.push("Email is required so we can send your quote.");
  }

  for (const item of missItems) {
    if (!trim(item.brand)) errors.push(`${HANDBAG_MISS_COPY.fieldBrand} is required.`);
    if (!trim(item.model || item.modelKey)) {
      errors.push(`${HANDBAG_MISS_COPY.fieldModel} is required.`);
    }
    if (!trim(item.colourOrMaterial || item.colorOrMaterial)) {
      errors.push(`${HANDBAG_MISS_COPY.fieldColour} is required.`);
    }
    if (!trim(item.condition || item.conditionRaw)) {
      errors.push(`${HANDBAG_MISS_COPY.fieldCondition} is required.`);
    }
    if (!hasRequiredHandbagPhotos(item.handbagPhotos)) {
      errors.push(
        `${HANDBAG_MISS_COPY.fieldPhotos} are required: front, back, interior, and hardware close-up.`
      );
    }
  }

  return { ok: errors.length === 0, missItems, errors };
}

export function appendHandbagMissNotes(notes, items) {
  const miss = (items || []).filter(isHandbagMissItem);
  if (!miss.length) return notes || "";
  const extra = miss
    .map((item) => {
      const photos = (item.handbagPhotos || [])
        .map((p) => p.key)
        .filter(Boolean)
        .join(", ");
      return [
        "[Handbag miss quote — no cash estimate]",
        `Brand: ${trim(item.brand) || "—"}`,
        `Model: ${trim(item.model || item.modelKey) || "—"}`,
        `Colour or material: ${trim(item.colourOrMaterial || item.colorOrMaterial) || "—"}`,
        `Condition: ${trim(item.condition || item.conditionRaw) || "—"}`,
        `Serial / authenticity card notes: ${trim(item.serialNotes) || "—"}`,
        `Photos: ${photos || "—"}`,
      ].join("\n");
    })
    .join("\n\n");
  return [trim(notes), extra].filter(Boolean).join("\n\n");
}
