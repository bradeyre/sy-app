/**
 * Pure helpers for the calculator → SHGA (Airtable Submissions) write.
 *
 * Kept free of fetch/db so Quoted Value, Payment Preference, Notes (quote
 * ref), and the 422 strip-retry can be tested without touching a live base.
 *
 * Incident SYM-BQDJ-M3Z3 (calc.leads id 457, recRaqGGkDIkDMeiX):
 * the customer was shown R9,654 (8395 × 1.15) but Airtable Quoted Value
 * stayed 8395, Payment Preference was blank, and quote_ref never landed.
 * Quoted Value is now the client-facing (uplifted) amount; Offer Amount
 * is the cash/base instant offer. Preference and money use the
 * server-validated bonus pct. A strip-retry must log the field it drops.
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

export const CRITICAL_AIRTABLE_FIELDS = [
  "Payment Preference",
  "Quoted Value",
  "Offer Amount",
  "Notes",
];

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
 * Cash / instant offer: accessory + extra − fault base, no consignment or
 * voucher uplift. This is SHGA "Offer Amount" (fld4QhiUqcMFFfiNy).
 */
export function itemOfferAmount(item) {
  if (item?.declined) return 0;
  const price = Number(item?.price) || 0;
  const accessories = Number(item?.accessoryBonusTotal) || 0;
  const extras = Number(item?.extrasTotalValue) || 0;
  const faults =
    (Number(item?.faultDeductionTotal) || 0) + (Number(item?.aiFaultDeductionTotal) || 0);
  return round2(Math.max(0, price + accessories + extras - faults));
}

/**
 * Client-facing Quoted Value for the chosen payment: Offer Amount ×
 * (1 + server bonus). EFT/cash stays on the base. Matches
 * calc.leads.quoted_total / the calculator total (round-2).
 */
export function itemQuotedValue(item, paymentBonusPct) {
  return round2(itemOfferAmount(item) * (1 + bonusPct(paymentBonusPct) / 100));
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
 * single-select string. Known keys (eft / consignment / voucher) always
 * resolve to a live choice so Payment Preference is never blank when the
 * customer picked one. Unknown / missing preference returns null so we
 * omit the field rather than invent a label that 422s the write.
 */
export function resolvePaymentPreference(preference, paymentBonusPct, liveChoices) {
  const key = norm(preference);
  if (!key) return null;
  if (key === "eft" || key === "cash") {
    return matchChoice(liveChoices, PAYMENT_PREF_EFT) || PAYMENT_PREF_EFT;
  }
  const pct = paymentBonusPct == null || paymentBonusPct === "" ? null : Number(paymentBonusPct);
  if (key === "consignment") {
    return pickByPct(CONSIGNMENT_CHOICES_BY_PCT, pct, PAYMENT_PREF_CONSIGNMENT_10, liveChoices);
  }
  if (key === "voucher") {
    return pickByPct(VOUCHER_CHOICES_BY_PCT, pct, PAYMENT_PREF_VOUCHER_12, liveChoices);
  }
  return matchChoice(liveChoices, preference) || null;
}

/**
 * Live Payment Preference still says "10% Extra" while the cockpit promo
 * is 15% until 30 Sep EOD. Do not rename that Airtable choice from code.
 * Put the server-applied rate on Notes so ops does not misread the label.
 */
export function paymentRateNote(preference, paymentBonusPct) {
  const key = norm(preference);
  if (key !== "consignment" && key !== "voucher") return null;
  const pct = Number(paymentBonusPct);
  if (!Number.isFinite(pct)) return null;
  const label = key === "consignment" ? "Consignment" : "Voucher";
  return `${label} rate applied: ${Math.round(pct)}%`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Quote ref is the only handle support has when a lead is in Postgres but
 * hard to find in Airtable. There is no dedicated quote_ref column, so it
 * is prepended to Notes without wiping customer text. Consignment/voucher
 * also carry the applied server % on the same header line.
 */
export function notesWithQuoteRef(notes, quoteRef, payment = {}) {
  const body = String(notes || "").trim();
  const ref = String(quoteRef || "").trim();
  const rate = paymentRateNote(payment.paymentPreference, payment.paymentBonusPct);
  const header = [ref && `Quote ref: ${ref}`, rate].filter(Boolean).join(" | ");
  if (!header) return body || null;
  if (body.includes(header)) return body;
  if (ref && body.includes(ref)) {
    const upgraded = body.replace(new RegExp(`Quote ref:\\s*${escapeRegExp(ref)}`), header);
    if (upgraded !== body) return upgraded;
    return body;
  }
  return body ? `${header}\n\n${body}` : header;
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
 * Payment Preference / Quoted Value / Offer Amount / Notes — rather than
 * dropping them silently. Auth and rate-limit failures are not retried.
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
