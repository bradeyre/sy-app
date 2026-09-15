import assert from "node:assert/strict";
import test from "node:test";
import {
  DEVICE_BRAND_FIELD,
  airtableLeadWriteBody,
  deviceModelText,
  namedFieldsFromAirtableError,
  notesWithQuoteRef,
  parseAirtableError,
  resolveDeviceBrand,
  rewriteRecordsForAirtableRetry,
} from "./airtableLeadFields.js";

function airtableErr(status, type, message) {
  return new Error(
    `Airtable POST appMB4HF3PkGe2rZd/tblx9AkbkYzo8Cqhu failed: ${status} ${JSON.stringify({
      error: { type, message },
    })}`
  );
}

test("airtableLeadWriteBody typecasts so new Device Brand options are created", () => {
  const body = airtableLeadWriteBody([{ fields: { [DEVICE_BRAND_FIELD]: "JBL" } }]);
  assert.equal(body.typecast, true);
  assert.equal(body.records[0].fields[DEVICE_BRAND_FIELD], "JBL");
});

test("resolveDeviceBrand sends the calculator brand as-is, including makers Airtable does not yet have", () => {
  assert.equal(resolveDeviceBrand("Apple"), "Apple");
  assert.equal(resolveDeviceBrand("ASUS"), "ASUS");
  assert.equal(resolveDeviceBrand("PHILIPS"), "PHILIPS");
  assert.equal(resolveDeviceBrand("Bose"), "Bose");
  assert.equal(resolveDeviceBrand("Sonos"), "Sonos");
  assert.equal(resolveDeviceBrand("JBL"), "JBL");
  assert.equal(resolveDeviceBrand("BrandAddedToCatalogueTomorrow"), "BrandAddedToCatalogueTomorrow");
  assert.equal(resolveDeviceBrand("  Tineco  "), "Tineco");
  assert.equal(resolveDeviceBrand(["Apple", "Samsung"]), null);
});

test("resolveDeviceBrand ignores the Epic Deals any-brand SQL wildcard", () => {
  assert.equal(resolveDeviceBrand(null, ["%"]), null);
  assert.equal(resolveDeviceBrand("", "%"), null);
});

test("resolveDeviceBrand uses a single site brand only as fallback", () => {
  assert.equal(resolveDeviceBrand(null, ["Apple"]), "Apple");
  assert.equal(resolveDeviceBrand(null, ["Apple", "Samsung"]), null);
  assert.equal(resolveDeviceBrand("Samsung", ["Apple"]), "Samsung");
});

test("deviceModelText keeps brand+model together on the text field", () => {
  assert.equal(deviceModelText("QuietComfort 45", "Bose"), "Bose QuietComfort 45");
  assert.equal(deviceModelText("Bose QuietComfort 45", "Bose"), "Bose QuietComfort 45");
  assert.equal(deviceModelText("PHILIPS Sonicare", "PHILIPS"), "PHILIPS Sonicare");
  assert.equal(deviceModelText("iPhone 15", ""), "iPhone 15");
});

test("notesWithQuoteRef prepends the reference and does not duplicate it", () => {
  assert.equal(notesWithQuoteRef("", "EDT-6FED-JGAA"), "Quote ref: EDT-6FED-JGAA");
  assert.equal(
    notesWithQuoteRef("Please call first", "EDT-6FED-JGAA"),
    "Quote ref: EDT-6FED-JGAA\n\nPlease call first"
  );
  assert.equal(
    notesWithQuoteRef("Quote ref: EDT-6FED-JGAA\n\nPlease call first", "EDT-6FED-JGAA"),
    "Quote ref: EDT-6FED-JGAA\n\nPlease call first"
  );
  assert.equal(notesWithQuoteRef("Please call first", ""), "Please call first");
  assert.equal(notesWithQuoteRef("", ""), null);
});

test("parseAirtableError reads type, status and message from the thrown wrap", () => {
  const parsed = parseAirtableError(
    airtableErr("422", "INVALID_MULTIPLE_CHOICE_OPTIONS", 'Insufficient permissions to create new select option "Dyson"')
  );
  assert.equal(parsed.status, 422);
  assert.equal(parsed.type, "INVALID_MULTIPLE_CHOICE_OPTIONS");
  assert.match(parsed.apiMessage, /Dyson/);
});

test("namedFieldsFromAirtableError extracts Cannot parse field names", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", 'Cannot parse value for field Device Brand (Select)');
  const records = [{ fields: { [DEVICE_BRAND_FIELD]: ["Apple", "Samsung"], "Quoted Value": 100 } }];
  assert.deepEqual(namedFieldsFromAirtableError(err, records), [DEVICE_BRAND_FIELD]);
});

test("namedFieldsFromAirtableError extracts Field \"X\" cannot accept", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", 'Field "Stated Capacity" cannot accept the provided value');
  const records = [{ fields: { "Stated Capacity": "N/A", Source: "EDT" } }];
  assert.deepEqual(namedFieldsFromAirtableError(err, records), ["Stated Capacity"]);
});

test("namedFieldsFromAirtableError maps INVALID_MULTIPLE_CHOICE_OPTIONS onto the field that sent that option", () => {
  const err = airtableErr(
    "422",
    "INVALID_MULTIPLE_CHOICE_OPTIONS",
    'Insufficient permissions to create new select option "Dyson"'
  );
  const records = [
    {
      fields: {
        [DEVICE_BRAND_FIELD]: "Dyson",
        "Device Model (Text)": "Dyson V15 Detect",
        Source: "EDT",
      },
    },
  ];
  assert.deepEqual(namedFieldsFromAirtableError(err, records), [DEVICE_BRAND_FIELD]);
});

test("rewriteRecordsForAirtableRetry falls back Device Brand to Other only if typecast still 422s", () => {
  const err = airtableErr(
    "422",
    "INVALID_MULTIPLE_CHOICE_OPTIONS",
    'Insufficient permissions to create new select option "Dyson"'
  );
  const records = [
    {
      fields: {
        [DEVICE_BRAND_FIELD]: "Dyson",
        "Device Model (Text)": "Dyson V15 Detect",
        Source: "EDT",
      },
    },
  ];
  const retried = rewriteRecordsForAirtableRetry(records, err);
  assert.equal(retried[0].fields[DEVICE_BRAND_FIELD], "Other");
  assert.equal(retried[0].fields["Device Model (Text)"], "Dyson V15 Detect");
});

test("rewriteRecordsForAirtableRetry strips an unparseable Device Brand array instead of sending Other", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", "Cannot parse value for field Device Brand (Select)");
  const records = [{ fields: { [DEVICE_BRAND_FIELD]: ["Apple", "Samsung"], Source: "EDT" } }];
  const retried = rewriteRecordsForAirtableRetry(records, err);
  assert.equal(DEVICE_BRAND_FIELD in retried[0].fields, false);
  assert.equal(retried[0].fields.Source, "EDT");
});

test("rewriteRecordsForAirtableRetry strips a named unparseable field", () => {
  const err = airtableErr("422", "INVALID_VALUE_FOR_COLUMN", "Cannot parse value for field Quoted Value");
  const records = [{ fields: { "Quoted Value": "R1,200", Source: "EDT" } }];
  const retried = rewriteRecordsForAirtableRetry(records, err);
  assert.equal("Quoted Value" in retried[0].fields, false);
  assert.equal(retried[0].fields.Source, "EDT");
});

test("rewriteRecordsForAirtableRetry does not retry auth or rate-limit failures", () => {
  const unauthorized = airtableErr("401", "UNAUTHORIZED", "Unauthorized");
  const records = [{ fields: { [DEVICE_BRAND_FIELD]: "Dyson" } }];
  assert.equal(rewriteRecordsForAirtableRetry(records, unauthorized), null);

  const rateLimited = airtableErr("429", "TOO_MANY_REQUESTS", "Too many requests");
  assert.equal(rewriteRecordsForAirtableRetry(records, rateLimited), null);
});

test("rewriteRecordsForAirtableRetry no-ops when the named field was not sent", () => {
  const err = airtableErr("422", "UNKNOWN_FIELD_NAME", 'Unknown field name: "Quote Ref"');
  const records = [{ fields: { Source: "EDT", Notes: "Quote ref: EDT-6FED-JGAA" } }];
  assert.equal(rewriteRecordsForAirtableRetry(records, err), null);
});
