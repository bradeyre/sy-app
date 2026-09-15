/**
 * Pure helpers for the Airtable lead write.
 *
 * Kept free of fetch/db so the 422 retry and brand mapping can be tested
 * without touching a live base. Incident EDT-6FED-JGAA (calc.leads id 411)
 * landed in Postgres and then vanished from ops because a Device Brand
 * INVALID_MULTIPLE_CHOICE_OPTIONS was not retried, and quote_ref was never
 * written onto the Airtable row.
 *
 * Device Brand (Select) is matched case-insensitively against the live
 * Airtable choices. A hardcoded DEVICE_BRAND_CHOICES list is not truth:
 * Bose/Sonos/JBL sat on that list while missing on the field. Unknown or
 * mismatched makers (and any brand ops has not added yet) are sent as
 * Other. Brand+model stay on Device Model (Text). Customer success is
 * not gated on this write.
 */

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

/**
 * "%" is how Epic Deals expresses "any brand" in SQL (site.where.brand),
 * not a device maker. Treating it as a brand would either 422 or record
 * nonsense on the Airtable select.
 */
function usableBrand(value) {
  if (Array.isArray(value)) return "";
  const raw = String(value || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!raw || raw === "%") return "";
  return raw;
}

function matchChoice(choices, value) {
  if (!value || !Array.isArray(choices)) return null;
  const needle = norm(value);
  return choices.find((choice) => norm(choice) === needle) || null;
}

/**
 * Read Device Brand (Select) choice names from an Airtable Meta API schema
 * payload. Returns null when the field is missing so callers can fall back
 * to Other rather than inventing a code allowlist.
 */
export function deviceBrandChoicesFromSchema(schema, tableId, fieldName = DEVICE_BRAND_FIELD) {
  const tables = schema?.tables || [];
  const table = tables.find((entry) => entry.id === tableId || entry.name === tableId);
  const field = (table?.fields || []).find((entry) => entry.name === fieldName);
  const choices = (field?.options?.choices || []).map((choice) => choice?.name).filter(Boolean);
  return choices.length ? choices : null;
}

/**
 * Map a catalogue brand onto a real Airtable Device Brand choice.
 *
 * `liveChoices` from the field schema is the only list we trust. A name
 * that is not on that field -- JBL, Bose, Sonos until ops add them, or
 * tomorrow's catalogue brand -- is sent as Other (or omitted if Other
 * itself is not a choice). PHILIPS matches Philips. Arrays and the Epic
 * Deals ["%"] wildcard are refused: that is INVALID_VALUE_FOR_COLUMN.
 *
 * When live choices could not be fetched, we still send Other rather than
 * trusting a hardcoded allowlist. The real maker stays on Device Model (Text).
 */
export function resolveDeviceBrand(itemBrand, siteBrands, liveChoices) {
  const fromSite = Array.isArray(siteBrands)
    ? siteBrands.length === 1
      ? siteBrands[0]
      : null
    : siteBrands;
  const raw = usableBrand(itemBrand) || usableBrand(fromSite);
  if (!raw) return null;
  const usingLive = Array.isArray(liveChoices) && liveChoices.length > 0;
  const choices = usingLive ? liveChoices : [OTHER_BRAND_CHOICE];
  const match = matchChoice(choices, raw);
  if (match) return match;
  const other = matchChoice(choices, OTHER_BRAND_CHOICE);
  if (other) {
    console.warn(
      `airtable: "${raw}" is not a choice on ${DEVICE_BRAND_FIELD}, sending "${other}". The catalogue name stays on Device Model (Text).`
    );
    return other;
  }
  console.warn(
    `airtable: "${raw}" is not a choice on ${DEVICE_BRAND_FIELD}, and "${OTHER_BRAND_CHOICE}" is not available; omitting the field. The catalogue name stays on Device Model (Text).`
  );
  return null;
}

/**
 * Keep brand+model on Device Model (Text) so ops still see the catalogue
 * maker when Device Brand (Select) is Other.
 */
export function deviceModelText(model, catalogBrand) {
  const name = String(model || "").trim();
  const brand = usableBrand(catalogBrand);
  if (!name) return brand || "";
  if (!brand) return name;
  const nameNorm = norm(name);
  const brandNorm = norm(brand);
  if (nameNorm === brandNorm || nameNorm.startsWith(`${brandNorm} `)) return name;
  return `${brand} ${name}`;
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
 * Defence in depth: if a named-field 422 still happens after mapping
 * unknown brands to Other (Cannot parse, INVALID_VALUE_FOR_COLUMN,
 * INVALID_MULTIPLE_CHOICE_OPTIONS, UNKNOWN_FIELD_NAME), rewrite once.
 * Device Brand becomes Other; any other named field is stripped.
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
