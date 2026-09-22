import { query } from "@/lib/db";
import { notBlockedSql } from "@/lib/catalogGate";
import {
  handbagCashPayoutBlockedByCatalog,
  HANDBAG_CASH_GATE_TYPES,
} from "@/lib/luxuryHandbagPaymentGate";

/**
 * Looks up catalogue rows for the submitted models and applies the
 * luxury-handbag EFT gate from catalogue type, not the payload.
 * Every Luxury Handbag blocks Direct EFT / cash (no value threshold).
 */
export async function catalogLuxuryHandbagCashPayoutBlocked({ site, items }) {
  const modelKeys = [
    ...new Set((items || []).map((item) => item.modelKey || item.model).filter(Boolean)),
  ];
  if (!modelKeys.length) return false;

  const { rows } = await query(
    `select brand, type, model, coalesce(capacity, 'N/A') as capacity, buy_price
     from calc.buy_prices_public bp
     where lower(type) = any($4::text[])
       and condition = 'Good'
       and brand ilike any($1)
       and model = any($2::text[])
       and ${notBlockedSql("bp", "$3")}`,
    [site.where.brand, modelKeys, site.key, HANDBAG_CASH_GATE_TYPES]
  );

  return handbagCashPayoutBlockedByCatalog(items, rows);
}
