import assert from "node:assert/strict";
import test from "node:test";
import {
  CRITICAL_AIRTABLE_FIELDS,
  itemOfferAmount,
  itemQuotedValue,
  namedFieldsFromAirtableError,
  notesWithQuoteRef,
  resolvePaymentPreference,
  rewriteRecordsForAirtableRetry,
} from "./airtableLeadSync.js";

const SYM_ITEM = {
  price: 8235,
  accessoryBonusTotal: 160,
  extrasTotalValue: 0,
  faultDeductionTotal: 0,
  aiFaultDeductionTotal: 0,
};

// Live SHGA Submissions "Payment Preference" choices (appMB4HF3PkGe2rZd).
const LIVE_PAYMENT_CHOICES = [
  "Default (EFT)",
  "Immediate Payment (EFT)",
  "Epic Deals Voucher (12% Extra!) - Spend it in our online store",
  "Epic Deals Consignment (10% Extra)",
];

function airtableErr(status, type, message) {
  return new Error(
    `Airtable POST appMB4HF3PkGe2rZd/tblx9AkbkYzo8Cqhu failed: ${status} ${JSON.stringify({
      error: { type, message },
    })}`
  );
}

test("Offer Amount is the cash/base instant offer, even when consignment is 15%", () => {
  // SYM-BQDJ-M3Z3: 8235 + 160 box/PSU = 8395. Promo does not change Offer Amount.
  assert.equal(itemOfferAmount(SYM_ITEM), 8395);
  assert.equal(itemQuotedValue(SYM_ITEM, 15), 9654.25);
  assert.equal(itemOfferAmount(SYM_ITEM), itemQuotedValue(SYM_ITEM, 0));
});

test("consignment Quoted Value applies the 15% promo the customer saw", () => {
  // SYM-BQDJ-M3Z3: 8235 + 160 box/PSU = 8395; 8395 × 1.15 = 9654.25
  assert.equal(itemQuotedValue(SYM_ITEM, 15), 9654.25);
});

test("consignment Quoted Value applies a 10% cockpit rate", () => {
  assert.equal(itemQuotedValue(SYM_ITEM, 10), 9234.5);
});

test("voucher Quoted Value applies the store-credit uplift", () => {
  assert.equal(itemQuotedValue(SYM_ITEM, 12), 9402.4);
});

test("EFT Quoted Value and Offer Amount stay on the accessory-adjusted base", () => {
  assert.equal(itemQuotedValue(SYM_ITEM, 0), 8395);
  assert.equal(itemQuotedValue(SYM_ITEM, null), 8395);
  assert.equal(itemOfferAmount(SYM_ITEM), 8395);
});

test("Quoted Value subtracts faults and includes extras before the uplift", () => {
  const item = {
    price: 8000,
    accessoryBonusTotal: 100,
    extrasTotalValue: 200,
    faultDeductionTotal: 50,
    aiFaultDeductionTotal: 50,
  };
  assert.equal(itemOfferAmount(item), 8200);
  assert.equal(itemQuotedValue(item, 15), 9430);
});

test("declined items quote as zero even when a bonus pct is present", () => {
  assert.equal(itemOfferAmount({ ...SYM_ITEM, declined: true }), 0);
  assert.equal(itemQuotedValue({ ...SYM_ITEM, declined: true }, 15), 0);
});

test("Payment Preference maps consignment at 15% onto the live 10% choice", () => {
  // Live Airtable has no 15% consignment option (promo is cockpit-only).
  assert.equal(
    resolvePaymentPreference("consignment", 15, LIVE_PAYMENT_CHOICES),
    "Epic Deals Consignment (10% Extra)"
  );
  assert.equal(
    resolvePaymentPreference("consignment", 10, LIVE_PAYMENT_CHOICES),
    "Epic Deals Consignment (10% Extra)"
  );
});

test("Payment Preference maps EFT and voucher onto live choices", () => {
  assert.equal(resolvePaymentPreference("eft", 0, LIVE_PAYMENT_CHOICES), "Default (EFT)");
  assert.equal(
    resolvePaymentPreference("voucher", 12, LIVE_PAYMENT_CHOICES),
    "Epic Deals Voucher (12% Extra!) - Spend it in our online store"
  );
  // 5% is not a live choice; fall back to the 12% label rather than 422.
  assert.equal(
    resolvePaymentPreference("voucher", 5, LIVE_PAYMENT_CHOICES),
    "Epic Deals Voucher (12% Extra!) - Spend it in our online store"
  );
});

test("Payment Preference still maps without a live-choice list", () => {
  assert.equal(resolvePaymentPreference("consignment", 15), "Epic Deals Consignment (10% Extra)");
  assert.equal(resolvePaymentPreference("eft", 0), "Default (EFT)");
});

test("Payment Preference is never blank when the customer selected a known option", () => {
  for (const [pref, pct] of [
    ["consignment", 15],
    ["consignment", null],
    ["Consignment", 15],
    ["eft", 0],
    ["cash", 0],
    ["voucher", 12],
    ["voucher", 5],
  ]) {
    const choice = resolvePaymentPreference(pref, pct, LIVE_PAYMENT_CHOICES);
    assert.ok(choice, `expected a live choice for ${pref} / ${pct}`);
    assert.ok(LIVE_PAYMENT_CHOICES.includes(choice), choice);
  }
});

test("Notes prepends quote ref and keeps customer notes", () => {
  assert.equal(notesWithQuoteRef(null, "SYM-BQDJ-M3Z3"), "Quote ref: SYM-BQDJ-M3Z3");
  assert.equal(notesWithQuoteRef("", "SYM-BQDJ-M3Z3"), "Quote ref: SYM-BQDJ-M3Z3");
  assert.equal(
    notesWithQuoteRef("Gate code 12", "SYM-BQDJ-M3Z3"),
    "Quote ref: SYM-BQDJ-M3Z3\n\nGate code 12"
  );
  assert.equal(
    notesWithQuoteRef("Quote ref: SYM-BQDJ-M3Z3\n\nGate code 12", "SYM-BQDJ-M3Z3"),
    "Quote ref: SYM-BQDJ-M3Z3\n\nGate code 12"
  );
  assert.equal(notesWithQuoteRef("Gate code 12", ""), "Gate code 12");
  assert.equal(notesWithQuoteRef("", ""), null);
});

test("Notes puts the applied consignment or voucher rate next to the quote ref", () => {
  const consign = { paymentPreference: "consignment", paymentBonusPct: 15 };
  const voucher = { paymentPreference: "voucher", paymentBonusPct: 12 };
  assert.equal(
    notesWithQuoteRef(null, "SYM-BQDJ-M3Z3", consign),
    "Quote ref: SYM-BQDJ-M3Z3 | Consignment rate applied: 15%"
  );
  assert.equal(
    notesWithQuoteRef("Gate code 12", "SYM-BQDJ-M3Z3", consign),
    "Quote ref: SYM-BQDJ-M3Z3 | Consignment rate applied: 15%\n\nGate code 12"
  );
  assert.equal(
    notesWithQuoteRef("Quote ref: SYM-BQDJ-M3Z3\n\nGate code 12", "SYM-BQDJ-M3Z3", consign),
    "Quote ref: SYM-BQDJ-M3Z3 | Consignment rate applied: 15%\n\nGate code 12"
  );
  assert.equal(
    notesWithQuoteRef(null, "SYM-BQDJ-M3Z3", voucher),
    "Quote ref: SYM-BQDJ-M3Z3 | Voucher rate applied: 12%"
  );
  assert.equal(
    notesWithQuoteRef(null, "SYM-BQDJ-M3Z3", { paymentPreference: "eft", paymentBonusPct: 0 }),
    "Quote ref: SYM-BQDJ-M3Z3"
  );
});

test("namedFieldsFromAirtableError extracts a Cannot parse field", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", 'Cannot parse value for field Quoted Value');
  const records = [{ fields: { "Quoted Value": 9654.25, Notes: "Quote ref: SYM-BQDJ-M3Z3" } }];
  assert.deepEqual(namedFieldsFromAirtableError(err, records), ["Quoted Value"]);
});

test("rewriteRecordsForAirtableRetry strips the named field and flags critical money fields", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", 'Cannot parse value for field Quoted Value');
  const records = [
    {
      fields: {
        "Quoted Value": 9654.25,
        "Payment Preference": "Epic Deals Consignment (10% Extra)",
        Notes: "Quote ref: SYM-BQDJ-M3Z3",
        Source: "SYM",
      },
    },
  ];
  const retried = rewriteRecordsForAirtableRetry(records, err);
  assert.equal("Quoted Value" in retried.records[0].fields, false);
  assert.equal(retried.records[0].fields["Payment Preference"], "Epic Deals Consignment (10% Extra)");
  assert.deepEqual(retried.strippedFields, ["Quoted Value"]);
  assert.equal(retried.strippedCritical, true);
  assert.ok(CRITICAL_AIRTABLE_FIELDS.includes("Quoted Value"));
  assert.ok(CRITICAL_AIRTABLE_FIELDS.includes("Offer Amount"));
});

test("rewriteRecordsForAirtableRetry flags Offer Amount as a critical strip", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", 'Cannot parse value for field Offer Amount');
  const records = [{ fields: { "Offer Amount": 8395, "Quoted Value": 9654.25, Source: "SYM" } }];
  const retried = rewriteRecordsForAirtableRetry(records, err);
  assert.equal("Offer Amount" in retried.records[0].fields, false);
  assert.equal(retried.records[0].fields["Quoted Value"], 9654.25);
  assert.deepEqual(retried.strippedFields, ["Offer Amount"]);
  assert.equal(retried.strippedCritical, true);
});

test("SYM-BQDJ-M3Z3 payload writes Offer Amount base, uplifted Quoted Value, preference, and quote ref", () => {
  assert.equal(itemOfferAmount(SYM_ITEM), 8395);
  assert.equal(itemQuotedValue(SYM_ITEM, 15), 9654.25);
  assert.equal(resolvePaymentPreference("consignment", 15), "Epic Deals Consignment (10% Extra)");
  assert.equal(
    notesWithQuoteRef(null, "SYM-BQDJ-M3Z3", { paymentPreference: "consignment", paymentBonusPct: 15 }),
    "Quote ref: SYM-BQDJ-M3Z3 | Consignment rate applied: 15%"
  );
});

test("rewriteRecordsForAirtableRetry does not swallow auth or rate-limit failures", () => {
  const records = [{ fields: { "Quoted Value": 8395 } }];
  assert.equal(rewriteRecordsForAirtableRetry(records, airtableErr("401", "UNAUTHORIZED", "Unauthorized")), null);
  assert.equal(rewriteRecordsForAirtableRetry(records, airtableErr("429", "TOO_MANY_REQUESTS", "Too many requests")), null);
});
