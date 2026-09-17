/**
 * Pure helpers for the calculator → SHGA (Airtable Submissions) write.
 *
 * Kept free of fetch/db so Quoted Value, Payment Preference, Notes (quote
 * ref), and the 422 strip-retry can be tested without touching a live base.
 *
 * Incident SYM-BQDJ-M3Z3 (calc.leads id 457, recRaqGGkDIkDMeiX):
 * the customer was shown R9,654 (8395 × 1.15) but Airtable Quoted Value
 * stayed 8395, Payment Preference was blank, and quote_ref never landed.
 * The money and preference mapping must use the server-validated bonus
 * pct, not a client figure, and a strip-retry must log the field it drops.
 */

export const PAYMENT_PREF_EFT = "Default (EFT)";
export const PAYMENT_PREF_VOUCHER_12 =
  "Epic Deals Voucher (12% Extra!) - Spend it in our online store";
// Live SHGA Submissions (appMB4HF3PkGe2rZd / tblx9AkbkYzo8Cqhu) has no 15%
// consignment choice — the 15% promo lives only in the cockpit. Any
// consignment bonus, including 15%, maps onto this existing 10% label
// until a 15% choice exists on the field. The old 5% voucher label is
// also not a live choice; unknown voucher rates fall back to the 12% one.
export const PAYMENT_PREF_CONSIGNMENT_10 = "Epic Deals Consignment (10% Extra)";

export const CRITICAL_AIRTABLE_FIELDS = ["Payment Preference", "Quoted Value", "Notes"];

const CONSIGNMENT_CHOICES_BY_PCT = {
  10: PAYMENT_PREF_CONSIGNMENT_10,
};

const VOUCHER_CHOICES_BY_PCT = {
  12: PAYMENT_PREF_VOUCHER_12,
};

const RETRYABLE_TYPES = new Set([
  "INVALID_MULTIPLE_CHOICE_OPTIONS",
  "INVALID_VALUE_FOR_COLUMN",
  "UNKNOWN_FIELD_NAME",
]);

const round2 = (n) => Math.round(n * 100) / 100;

function norm(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function bonusPct(value) {
  if (value == null || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/**
 * Per-item Quoted Value: accessory/extra/fault-adjusted base, then the
 * server bonus for consignment or voucher. EFT stays on the base.
 * Matches calc.leads.quoted_total / the calculator total (round-2).
 */
export function itemQuotedValue(item, paymentBonusPct) {
  if (item?.declined) return 0;
  const price = Number(item?.price) || 0;
  const accessories = Number(item?.accessoryBonusTotal) || 0;
  const extras = Number(item?.extrasTotalValue) || 0;
  const faults =
    (Number(item?.faultDeductionTotal) || 0) + (Number(item?.aiFaultDeductionTotal) || 0);
  const base = Math.max(0, price + accessories + extras - faults);
  return round2(base * (1 + bonusPct(paymentBonusPct) / 100));
}

function matchChoice(choices, value) {
  if (!value || !Array.isArray(choices) || choices.length === 0) return null;
  const needle = norm(value);
  return choices.find((choice) => norm(choice) === needle) || null;
}

function pickByPct(choicesByPct, pct, fallback, liveChoices) {
  const rounded = Math.round(Number(pct));
  const mapped = Number.isFinite(rounded) ? choicesByPct[rounded] : null;
  const candidate = mapped || fallback;
  const live = matchChoice(liveChoices, candidate);
  if (live) return live;
  if (Array.isArray(liveChoices) && liveChoices.length) {
    const fallbackLive = matchChoice(liveChoices, fallback);
    if (fallbackLive) return fallbackLive;
  }
  return candidate;
}

/**
 * Map calculator paymentPreference + server bonus pct onto a live SHGA
 * single-select string. Unknown / missing preference returns null so we
 * omit the field rather than invent a label that 422s the write.
 */
export function resolvePaymentPreference(preference, paymentBonusPct, liveChoices) {
  const key = norm(preference);
  if (!key) return null;
  if (key === "eft") {
    return matchChoice(liveChoices, PAYMENT_PREF_EFT) || PAYMENT_PREF_EFT;
  }
  const pct = paymentBonusPct == null || paymentBonusPct === "" ? null : Number(paymentBonusPct);
  if (key === "consignment") {
    return pickByPct(CONSIGNMENT_CHOICES_BY_PCT, pct, PAYMENT_PREF_CONSIGNMENT_10, liveChoices);
  }
  if (key === "voucher") {
    return pickByPct(VOUCHER_CHOICES_BY_PCT, pct, PAYMENT_PREF_VOUCHER_12, liveChoices);
  }
  return matchChoice(liveChoices, preference);
}

/**
 * Quote ref is the only handle support has when a lead is in Postgres but
 * hard to find in Airtable. There is no dedicated quote_ref column, so it
 * is prepended to Notes without wiping customer text.
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
  const typeMatch =
    type ||
    (raw.match(/\b(INVALID_MULTIPLE_CHOICE_OPTIONS|INVALID_VALUE_FOR_COLUMN|UNKNOWN_FIELD_NAME)\b/) ||
      [])[1] ||
    null;
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
  /Cannot parse value for field\s*"([^"]+)"/i,
  /Cannot parse value for field\s+([^\n]+?)(?:"|$)/i,
  /Field\s+"([^"]+)"\s+cannot accept/i,
  /Unknown field name:\s*"([^"]+)"/i,
  /for field\s+"([^"]+)"/i,
];

function optionFromMultipleChoiceError(text) {
  const match =
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

/**
 * Defence in depth: if a named-field 422 still happens, strip that field
 * once so the lead lands. Callers must log strippedFields — especially
 * Payment Preference / Quoted Value / Notes — rather than dropping them
 * silently. Auth and rate-limit failures are not retried.
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
      delete nextFields[name];
      changed = true;
    }
    return { ...record, fields: nextFields };
  });
  if (!changed) return null;
  const strippedCritical = fields.some((name) => CRITICAL_AIRTABLE_FIELDS.includes(name));
  return { records: next, strippedFields: fields, strippedCritical, parsed };
}

export function airtableStripRetryLog({ leadId, quoteRef, strippedFields, strippedCritical, err }) {
  return {
    event: "airtable_field_stripped_retry",
    leadId: leadId || null,
    quoteRef: quoteRef || null,
    fields: strippedFields,
    critical: Boolean(strippedCritical),
    reason: String(err?.message || err || "unknown"),
  };
}
