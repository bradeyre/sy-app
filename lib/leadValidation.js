/**
 * Shared lead-submit gates used by the API and the details form.
 * Keep bank / ID rules here so miss-flow and matched consign stay in lockstep.
 */

import { cartHasHandbagMiss } from "./luxuryHandbagMiss.js";

export const LEAD_IDENTITY_ERROR =
  "ID number, a copy of your ID/passport, a selfie, and accepting the terms and privacy policy are all required to sell to us";

export const LEAD_BANK_ERROR =
  "Bank name, account type, branch code, and account number are required for this payment option";

/**
 * Banking is required for EFT and consignment — except Luxury Handbag
 * miss-flow, which emails a quote (no EFT payout) and must not block on bank.
 * Fields are still accepted if the client sends them.
 */
export function leadRequiresBankDetails({ paymentPreference, items } = {}) {
  if (cartHasHandbagMiss(items)) return false;
  return paymentPreference === "eft" || paymentPreference === "consignment";
}

export function validateLeadIdentity({
  idNumber,
  idDocumentPath,
  selfiePath,
  ageConfirmed,
  termsAccepted,
  privacyAccepted,
} = {}) {
  if (!idNumber || !idDocumentPath || !selfiePath || !ageConfirmed || !termsAccepted || !privacyAccepted) {
    return { ok: false, error: LEAD_IDENTITY_ERROR };
  }
  return { ok: true };
}

export function validateLeadBankDetails({
  paymentPreference,
  items,
  bankName,
  accountType,
  branchCode,
  accountNumber,
} = {}) {
  if (
    leadRequiresBankDetails({ paymentPreference, items }) &&
    (!bankName || !accountType || !branchCode || !accountNumber)
  ) {
    return { ok: false, error: LEAD_BANK_ERROR };
  }
  return { ok: true };
}

export function validateLeadIdentityAndBank(body = {}) {
  const identity = validateLeadIdentity(body);
  if (!identity.ok) return identity;
  return validateLeadBankDetails(body);
}
