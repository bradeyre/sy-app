/**
 * Pure helpers for the Airtable lead write.
 *
 * Kept free of fetch/db so the 422 retry and brand fallback can be tested
 * without touching a live base. Incident EDT-6FED-JGAA (calc.leads id 411)
 * landed in Postgres and then vanished from ops because a Device Brand
 * INVALID_MULTIPLE_CHOICE_OPTIONS was not retried, and quote_ref was never
 * written onto the Airtable row.
 */

export const DEVICE_BRAND_CHOICES = [
  "Apple",
  "Samsung",
  "Sony",
  "Microsoft",
  "Nintendo",
  "Steam",
  "Lenovo",
  "Asus",
  "Acer",
  "Dell",
  "HP",
  "MSI",
  "Razer",
  "Google",
  "Huawei",
  "Honor",
  "Oppo",
  "Vivo",
  "Xiaomi",
  "Redmi",
  "OnePlus",
  "Nothing",
  "CMF by Nothing",
  "LG",
  "HTC",
  "Meta",
  "Garmin",
  "GoPro",
  "Beats",
  "Bose",
  "Sonos",
  "Canon",
  "Logitech",
  "Hisense",
  "Philips",
  "Siemens",
  "Nespresso",
  "WD",
  "Bowers & Wilkins",
  "DJI",
  "DeLonghi",
  "Dyson",
  "Ecovacs",
  "Gaggia",
  "Jura",
  "Miele",
  "Philips Saeco",
  "Roborock",
  "Sage",
  "Shark",
  "ghd",
  "Other",
];

export const DEVICE_BRAND_FIELD = "Device Brand (Select)";
export const OTHER_BRAND_CHOICE = "Other";

const RETRYABLE_TYPES = new Set([
  "INVALID_MULTIPLE_CHOICE_OPTIONS",
  "INVALID_VALUE_FOR_COLUMN",
  "UNKNOWN_FIELD_NAME",
]);

function norm(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function matchChoice(choices, value) {
  if (!value) return null;
  const needle = norm(value);
  return choices.find((choice) => norm(choice) === needle) || null;
}

/**
 * "%" is how Epic Deals expresses "any brand" in SQL (site.where.brand),
 * not a device maker. Treating it as a brand would either 422 or record
 * nonsense on the Airtable select.
 */
function usableBrand(value) {
  const raw = String(value || "").trim();
  if (!raw || raw === "%") return "";
  return raw;
}

/**
 * Airtable's Device Brand field is a single-select. The catalogue brand is
 * the right answer; the site filter is only a fallback when it names exactly
 * one real maker.
 *
 * A string the field does not have 422s the whole batch with
 * INVALID_MULTIPLE_CHOICE_OPTIONS -- that is what swallowed Epic Deals
 * trade-in lead 411. Unknown makers are recorded as "Other" so the row
 * still lands; the real name is already in Device Model (Text).
 */
export function resolveDeviceBrand(itemBrand, siteBrands) {
  const fromSite = Array.isArray(siteBrands)
    ? siteBrands.length === 1
      ? siteBrands[0]
      : null
    : siteBrands;
  const raw = usableBrand(itemBrand) || usableBrand(fromSite);
  if (!raw) return null;
  const match = matchChoice(DEVICE_BRAND_CHOICES, raw);
  if (match) return match;
  console.warn(
    `airtable: "${raw}" is not a choice on ${DEVICE_BRAND_FIELD}, sending "${OTHER_BRAND_CHOICE}" instead. Add it to the Airtable field and to DEVICE_BRAND_CHOICES to start recording it.`
  );
  return OTHER_BRAND_CHOICE;
}

/**
 * Quote ref is the only handle support and n8n have for a submission that
 * never appeared in Airtable. There is no dedicated field we can trust to
 * exist, so it is prepended to Notes (which already does).
 */
export function notesWithQuoteRef(notes, quoteRef) {
  const body = String(notes || "").trim();
  const ref = String(quoteRef || "").trim();
  if (!ref) return body || null;
  if (body.includes(ref)) return body;
  const line = `Quote ref: ${ref}`;
  return body ? `${line}\n\n${body}` : line;
}

export function parseAirtableError(err) {
  const raw = String(err?.message || err || "");
  const statusMatch = raw.match(/\bfailed:\s*(\d{3})\b/i) || raw.match(/\bstatus[:\s]+(\d{3})\b/i);
  const status = statusMatch ? Number(statusMatch[1]) : null;
  let type = null;
  let apiMessage = raw;
  const jsonStart = raw.indexOf("{");
  if (jsonStart >= 0) {
    try {
      const parsed = JSON.parse(raw.slice(jsonStart));
      type = parsed?.error?.type || null;
      if (parsed?.error?.message) apiMessage = parsed.error.message;
    } catch {
      // Body is not JSON; fall through to regex on the raw string.
    }
  }
  const typeMatch = type || (raw.match(/\b(INVALID_MULTIPLE_CHOICE_OPTIONS|INVALID_VALUE_FOR_COLUMN|UNKNOWN_FIELD_NAME)\b/) || [])[1] || null;
  return { raw, status, type: typeMatch, apiMessage };
}

export function isRetryableFieldError(parsed) {
  if (!parsed) return false;
  if (parsed.status != null && parsed.status !== 422) return false;
  if (RETRYABLE_TYPES.has(parsed.type)) return true;
  if (/Cannot parse value for field/i.test(parsed.raw) || /Cannot parse value for field/i.test(parsed.apiMessage)) {
    return true;
  }
  if (/Field ".+" cannot accept/i.test(parsed.apiMessage)) return true;
  if (/Unknown field name:/i.test(parsed.apiMessage)) return true;
  return parsed.status === 422;
}

const FIELD_NAME_PATTERNS = [
  /Cannot parse value for field\s*\\*"([^"\\]+)\\*"/i,
  /Cannot parse value for field\s+([^"\n]+?)(?:\\*"|"|$)/i,
  /Field\s*\\*"([^"\\]+)\\*"\s+cannot accept/i,
  /Unknown field name:\s*\\*"([^"\\]+)\\*"/i,
  /for field\s*\\*"([^"\\]+)\\*"/i,
  /column\s*\\*"([^"\\]+)\\*"/i,
];

function optionFromMultipleChoiceError(text) {
  const match =
    /(?:create new select option|invalid multiple choice options)[^"]*\\*"([^"\\]+)\\*"/i.exec(text) ||
    /(?:create new select option|invalid multiple choice options)[^"]*"([^"]+)"/i.exec(text);
  return match?.[1] || null;
}

function fieldValueMatchesOption(value, option) {
  if (value == null || option == null) return false;
  if (typeof value === "string") return value === option;
  if (Array.isArray(value)) return value.some((entry) => fieldValueMatchesOption(entry, option));
  if (typeof value === "object" && typeof value.name === "string") return value.name === option;
  return false;
}

/**
 * Pull the Airtable field name(s) a 422 is complaining about.
 *
 * INVALID_MULTIPLE_CHOICE_OPTIONS often names the option ("Dyson") and not
 * the column. In that case we look at the payload we just sent and strip
 * the field whose value is that option.
 */
export function namedFieldsFromAirtableError(err, records = []) {
  const parsed = parseAirtableError(err);
  const text = `${parsed.apiMessage}\n${parsed.raw}`;
  const names = new Set();

  for (const pattern of FIELD_NAME_PATTERNS) {
    const match = pattern.exec(text);
    const name = match?.[1]?.replace(/\\/g, "").trim();
    if (name) names.add(name);
  }

  const option = optionFromMultipleChoiceError(text);
  if (option) {
    for (const record of records) {
      for (const [key, value] of Object.entries(record.fields || {})) {
        if (fieldValueMatchesOption(value, option)) names.add(key);
      }
    }
  }

  if (names.size === 0) return [];
  if (!records.length) return [...names];
  return [...names].filter((name) => records.some((record) => name in (record.fields || {})));
}

function rewriteFieldValue(fieldName, currentValue, parsed) {
  if (
    fieldName === DEVICE_BRAND_FIELD &&
    parsed.type === "INVALID_MULTIPLE_CHOICE_OPTIONS" &&
    currentValue !== OTHER_BRAND_CHOICE
  ) {
    return { action: "replace", value: OTHER_BRAND_CHOICE };
  }
  return { action: "strip" };
}

/**
 * Build a one-shot retry payload: drop (or, for Device Brand, replace with
 * Other) every field the 422 named. Returns null when there is nothing safe
 * to retry.
 */
export function rewriteRecordsForAirtableRetry(records, err) {
  const parsed = parseAirtableError(err);
  if (!isRetryableFieldError(parsed)) return null;
  const fields = namedFieldsFromAirtableError(err, records);
  if (fields.length === 0) return null;

  let changed = false;
  const next = records.map((record) => {
    const nextFields = { ...(record.fields || {}) };
    for (const name of fields) {
      if (!(name in nextFields)) continue;
      const rewrite = rewriteFieldValue(name, nextFields[name], parsed);
      if (rewrite.action === "replace") nextFields[name] = rewrite.value;
      else delete nextFields[name];
      changed = true;
    }
    return { ...record, fields: nextFields };
  });
  return changed ? next : null;
}
