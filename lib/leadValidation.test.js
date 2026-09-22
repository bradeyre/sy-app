import assert from "node:assert/strict";
import test from "node:test";
import { HANDBAG_MISS_REQUIRED_SHOTS, validateHandbagMissLead } from "./luxuryHandbagMiss.js";
import { isCashPayoutPreference } from "./luxuryHandbagPaymentGate.js";
import { leadRequiresBankDetails, validateLeadIdentityAndBank } from "./leadValidation.js";

function validMissItem(overrides = {}) {
  return {
    missFlow: true,
    categoryType: "Luxury Handbag",
    brand: "Loewe",
    model: "Puzzle",
    colourOrMaterial: "Tan leather",
    condition: "Good",
    conditionRaw: "Good",
    estimateUnavailable: true,
    price: 0,
    basePrice: 0,
    handbagPhotos: HANDBAG_MISS_REQUIRED_SHOTS.map((s) => ({
      key: s.key,
      path: `${s.key}.jpg`,
    })),
    ...overrides,
  };
}

function validIdentity(overrides = {}) {
  return {
    idNumber: "9001014800087",
    idDocumentPath: "id/doc.jpg",
    selfiePath: "id/selfie.jpg",
    ageConfirmed: true,
    termsAccepted: true,
    privacyAccepted: true,
    ...overrides,
  };
}

const matchedHandbag = {
  categoryType: "Luxury Handbag",
  isEstimate: true,
  estimateUnavailable: false,
  model: "Neverfull",
  brand: "Louis Vuitton",
  price: 37_800,
};

test("miss-flow does not require bank details for consign or voucher", () => {
  const items = [validMissItem()];
  assert.equal(leadRequiresBankDetails({ paymentPreference: "consignment", items }), false);
  assert.equal(leadRequiresBankDetails({ paymentPreference: "voucher", items }), false);
  assert.equal(leadRequiresBankDetails({ paymentPreference: "eft", items }), false);
});

test("miss-flow lead validates without bank when ID and selfie are present", () => {
  const body = {
    items: [validMissItem()],
    paymentPreference: "consignment",
    ...validIdentity(),
  };
  const result = validateLeadIdentityAndBank(body);
  assert.equal(result.ok, true);
  assert.equal(result.error, undefined);
});

test("miss-flow still fails without ID number, ID document, or selfie", () => {
  const base = {
    items: [validMissItem()],
    paymentPreference: "consignment",
    ...validIdentity(),
  };
  assert.equal(validateLeadIdentityAndBank({ ...base, idNumber: "" }).ok, false);
  assert.equal(validateLeadIdentityAndBank({ ...base, idDocumentPath: "" }).ok, false);
  assert.equal(validateLeadIdentityAndBank({ ...base, selfiePath: "" }).ok, false);
  assert.match(
    validateLeadIdentityAndBank({ ...base, selfiePath: null }).error,
    /ID number|selfie|terms/i
  );
});

test("miss-flow still rejects Direct EFT", () => {
  assert.equal(isCashPayoutPreference("eft"), true);
  const eft = validateHandbagMissLead({
    items: [validMissItem()],
    paymentPreference: "eft",
    authenticityAccepted: true,
    email: "seller@example.com",
  });
  assert.equal(eft.ok, false);
  assert.match(eft.errors.join(" "), /consignment|voucher|EFT/i);
});

test("matched non-miss Luxury Handbag consign still requires bank", () => {
  const items = [matchedHandbag];
  assert.equal(leadRequiresBankDetails({ paymentPreference: "consignment", items }), true);
  assert.equal(
    validateLeadIdentityAndBank({
      items,
      paymentPreference: "consignment",
      ...validIdentity(),
    }).ok,
    false
  );
  assert.equal(
    validateLeadIdentityAndBank({
      items,
      paymentPreference: "consignment",
      ...validIdentity(),
      bankName: "FNB",
      accountType: "Cheque",
      branchCode: "250655",
      accountNumber: "1234567890",
    }).ok,
    true
  );
});

test("non-handbag consign still requires bank; voucher does not", () => {
  const items = [{ categoryType: "Phone", model: "iPhone 15", price: 5_000 }];
  assert.equal(leadRequiresBankDetails({ paymentPreference: "consignment", items }), true);
  assert.equal(leadRequiresBankDetails({ paymentPreference: "eft", items }), true);
  assert.equal(leadRequiresBankDetails({ paymentPreference: "voucher", items }), false);
});

test("mixed miss + matched/phone consign still requires bank", () => {
  const mixed = [validMissItem(), matchedHandbag];
  assert.equal(leadRequiresBankDetails({ paymentPreference: "consignment", items: mixed }), true);
  assert.equal(
    validateLeadIdentityAndBank({
      items: mixed,
      paymentPreference: "consignment",
      ...validIdentity(),
    }).ok,
    false
  );

  const missAndPhone = [
    validMissItem(),
    { categoryType: "Phone", model: "iPhone 15", price: 5_000 },
  ];
  assert.equal(
    leadRequiresBankDetails({ paymentPreference: "consignment", items: missAndPhone }),
    true
  );
});

test("miss-flow still accepts bank details when they are sent", () => {
  const result = validateLeadIdentityAndBank({
    items: [validMissItem()],
    paymentPreference: "consignment",
    ...validIdentity(),
    bankName: "FNB",
    accountType: "Cheque",
    branchCode: "250655",
    accountNumber: "1234567890",
  });
  assert.equal(result.ok, true);
});
