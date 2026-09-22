import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  HANDBAG_MISS_COPY,
  HANDBAG_MISS_NOTIFY_TO,
  HANDBAG_MISS_PHOTO_SHOTS,
  HANDBAG_MISS_REQUIRED_SHOTS,
  cartHasHandbagMiss,
  cartIsQuotePendingMiss,
  hasRequiredHandbagPhotos,
  isHandbagMissItem,
  leadPostSubmitJobs,
  payloadBlocksHandbagMissCashPayout,
  sanitizeHandbagMissItems,
  validateHandbagMissLead,
} from "./luxuryHandbagMiss.js";
import { isCashPayoutPreference } from "./luxuryHandbagPaymentGate.js";
import { isHeicFile } from "./imageCompress.js";

test("Buyback miss copy strings are locked exactly", () => {
  assert.equal(
    HANDBAG_MISS_COPY.missEntryCta,
    "Can't find your bag? Add the brand, model, and photos and we'll email you a quote."
  );
  assert.equal(
    HANDBAG_MISS_COPY.promise48h,
    "We'll get back to you within 48 working hours."
  );
  assert.equal(
    HANDBAG_MISS_COPY.thankYou,
    "Got it. Our team will email you a quote within 48 working hours."
  );
  assert.equal(
    HANDBAG_MISS_COPY.counterfeitDisclaimer,
    "We only buy authentic bags. Authenticity is your responsibility before you ship. If the bag turns out to be counterfeit, you pay the return courier plus a R799 assessment fee."
  );
  assert.equal(HANDBAG_MISS_NOTIFY_TO, "jarred@epicdeals.co.za");
  assert.equal(HANDBAG_MISS_COPY.authHelperUrl, "https://realauthentication.com/");
  assert.match(HANDBAG_MISS_COPY.authHelperCta, /Real Authentication/);
  assert.match(HANDBAG_MISS_COPY.authHelperCta, /pay-per-item/i);
  assert.doesNotMatch(HANDBAG_MISS_COPY.authHelperCta, /Entrupy/i);
  assert.equal(HANDBAG_MISS_COPY.addPhotos, "Add photos");
  assert.equal(HANDBAG_MISS_COPY.fieldBrand, "Brand");
  assert.equal(HANDBAG_MISS_COPY.fieldModel, "Model");
  assert.equal(HANDBAG_MISS_COPY.fieldColour, "Colour or material");
  assert.equal(HANDBAG_MISS_COPY.fieldCondition, "Condition");
  assert.equal(HANDBAG_MISS_COPY.fieldPhotos, "Photos");
  assert.equal(HANDBAG_MISS_COPY.fieldSerial, "Serial / authenticity card notes");
});

test("photo checklist is 4 required + 2 optional with locked labels", () => {
  assert.equal(HANDBAG_MISS_PHOTO_SHOTS.length, 6);
  assert.deepEqual(
    HANDBAG_MISS_REQUIRED_SHOTS.map((s) => s.label),
    [
      "Front / logo side",
      "Back",
      "Interior / lining",
      "Hardware close-up (zip, clasp, feet)",
    ]
  );
  assert.deepEqual(
    HANDBAG_MISS_PHOTO_SHOTS.filter((s) => !s.required).map((s) => s.label),
    [
      "Serial, authenticity card, or date code",
      "Wear, stains, or damage",
    ]
  );
});

function validMissItem(overrides = {}) {
  return {
    missFlow: true,
    categoryType: "Luxury Handbag",
    brand: "Loewe",
    model: "Puzzle",
    colourOrMaterial: "Tan leather",
    condition: "Good",
    conditionRaw: "Good",
    price: 0,
    basePrice: 0,
    handbagPhotos: HANDBAG_MISS_REQUIRED_SHOTS.map((s) => ({
      key: s.key,
      path: `${s.key}.jpg`,
    })),
    ...overrides,
  };
}

test("valid miss payload is accepted for consign/voucher only", () => {
  const okConsign = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "consignment",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(okConsign.ok, true);
  assert.equal(okConsign.errors.length, 0);

  const okVoucher = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "voucher",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(okVoucher.ok, true);
});

test("miss-flow rejects Direct EFT / cash", () => {
  assert.equal(isCashPayoutPreference("eft"), true);
  const eft = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "eft",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(eft.ok, false);
  assert.match(eft.errors.join(" "), /consignment|voucher|EFT/i);

  const cash = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "cash",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(cash.ok, false);
});

test("miss-flow requires brand, model, colour or material, condition, photos", () => {
  for (const field of ["brand", "model", "colourOrMaterial", "condition"]) {
    const bad = validateHandbagMissLead({
      items: [validMissItem({ [field]: "", conditionRaw: field === "condition" ? "" : "Good" })],
      paymentPreference: "consignment",
      authenticityAccepted: true,
      email: "seller@example.com",
    });
    assert.equal(bad.ok, false, `expected ${field} to be required`);
  }

  const noPhotos = validateHandbagMissLead({
    items: [validMissItem({ handbagPhotos: [] })],
    paymentPreference: "consignment",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(noPhotos.ok, false);
  assert.match(noPhotos.errors.join(" "), /Photos/i);
});

test("serial notes are optional", () => {
  const ok = validateHandbagMissLead({
    items: [validMissItem({ serialNotes: "" })],
    paymentPreference: "consignment",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(ok.ok, true);
});

test("counterfeit checkbox is required before submit", () => {
  const missing = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "consignment",
    authenticityAccepted: false,
    email: "seller@example.com",
  });
  assert.equal(missing.ok, false);
  assert.equal(
    missing.errors.includes(HANDBAG_MISS_COPY.counterfeitDisclaimer),
    true
  );
});

test("required photo keys must all be present with a path", () => {
  assert.equal(hasRequiredHandbagPhotos(validMissItem().handbagPhotos), true);
  assert.equal(
    hasRequiredHandbagPhotos(
      validMissItem().handbagPhotos.filter((p) => p.key !== "hardware")
    ),
    false
  );
  assert.equal(
    hasRequiredHandbagPhotos([
      { key: "front", path: "a.jpg" },
      { key: "back", path: "b.jpg" },
      { key: "interior", path: "c.jpg" },
      { key: "hardware", path: "" },
    ]),
    false
  );
});

test("catalog estimate-unavailable handbags are miss items", () => {
  const item = {
    categoryType: "Luxury Handbag",
    estimateUnavailable: true,
    brand: "Chanel",
    model: "Classic Flap",
  };
  assert.equal(isHandbagMissItem(item), true);
  assert.equal(cartHasHandbagMiss([item]), true);
  assert.equal(isHandbagMissItem({ categoryType: "Phone" }), false);
});

test("payload gate blocks cash on miss-flow even without a catalogue row", () => {
  assert.equal(
    payloadBlocksHandbagMissCashPayout(
      [validMissItem()],
      "eft"
    ),
    true
  );
  assert.equal(
    payloadBlocksHandbagMissCashPayout(
      [validMissItem()],
      "consignment"
    ),
    false
  );
  assert.equal(
    payloadBlocksHandbagMissCashPayout(
      [{ categoryType: "Phone", model: "iPhone 15" }],
      "eft"
    ),
    false
  );
});

test("sanitize zeros any invented cash figure on miss items", () => {
  const [clean] = sanitizeHandbagMissItems([
    validMissItem({ price: 18_900, basePrice: 18_900, quotedTotal: 20_000 }),
  ]);
  assert.equal(clean.price, 0);
  assert.equal(clean.basePrice, 0);
  assert.equal(clean.estimateUnavailable, true);
  assert.equal(clean.missFlow, true);
  assert.equal(clean.isEstimate, true);
});

test("HEIC WhatsApp fallback is detected from type or extension", () => {
  assert.equal(isHeicFile({ type: "image/heic", name: "IMG_0001.HEIC" }), true);
  assert.equal(isHeicFile({ type: "image/heif", name: "shot.heif" }), true);
  assert.equal(isHeicFile({ type: "", name: "bag.HEIC" }), true);
  assert.equal(isHeicFile({ type: "image/jpeg", name: "bag.jpg" }), false);
});

const PRICED_PHONE = {
  categoryType: "Phone",
  model: "iPhone 15",
  price: 8200,
  missFlow: false,
  estimateUnavailable: false,
};

test("quote-pending miss carts suppress the Airtable payday confirmation path", () => {
  const missOnly = [validMissItem()];
  const unavailableBag = [
    { categoryType: "Luxury Handbag", estimateUnavailable: true, brand: "Chanel", model: "Classic Flap" },
  ];
  const missFlowFlag = [{ missFlow: true, brand: "Loewe", model: "Puzzle" }];

  assert.equal(cartIsQuotePendingMiss(missOnly), true);
  assert.equal(cartIsQuotePendingMiss(unavailableBag), true);
  assert.equal(cartIsQuotePendingMiss(missFlowFlag), true);
  assert.deepEqual(leadPostSubmitJobs(missOnly), {
    notifyHandbagMiss: true,
    syncLeadToAirtable: false,
  });
  assert.deepEqual(leadPostSubmitJobs(unavailableBag), {
    notifyHandbagMiss: true,
    syncLeadToAirtable: false,
  });
});

test("priced and mixed carts still queue the Airtable confirmation path", () => {
  assert.equal(cartIsQuotePendingMiss([PRICED_PHONE]), false);
  assert.equal(cartIsQuotePendingMiss([PRICED_PHONE, validMissItem()]), false);
  assert.equal(cartIsQuotePendingMiss([]), false);
  assert.deepEqual(leadPostSubmitJobs([PRICED_PHONE]), {
    notifyHandbagMiss: false,
    syncLeadToAirtable: true,
  });
  assert.deepEqual(leadPostSubmitJobs([PRICED_PHONE, validMissItem()]), {
    notifyHandbagMiss: true,
    syncLeadToAirtable: true,
  });
});

test("lead route gates payday sync through leadPostSubmitJobs and never sends the app confirmation email", () => {
  const src = readFileSync(new URL("../app/api/lead/route.js", import.meta.url), "utf8");
  assert.match(src, /leadPostSubmitJobs/);
  assert.match(src, /jobs\.syncLeadToAirtable/);
  assert.match(src, /jobs\.notifyHandbagMiss/);
  assert.doesNotMatch(src, /sendLeadConfirmationEmail/);
});
