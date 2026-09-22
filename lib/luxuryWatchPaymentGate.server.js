import { query } from "@/lib/db";
import { notBlockedSql } from "@/lib/catalogGate";
import {
  LUXURY_HANDBAG_TYPE,
  cashPayoutBlockedByCatalog,
  WATCH_CASH_GATE_TYPES,
} from "@/lib/luxuryWatchPaymentGate";

function submittedModelKeys(items) {
  return [...new Set((items || []).map((item) => item.modelKey || item.model).filter(Boolean))];
}

/**
 * Looks up Good-condition cash buy prices for the submitted models and
 * applies the luxury-watch EFT gate from catalogue rows, not the payload.
 */
export async function catalogLuxuryWatchCashPayoutBlocked({ site, items }) {
  const modelKeys = submittedModelKeys(items);
  if (!modelKeys.length) return false;

  const { rows } = await query(
    `select brand, type, model, coalesce(capacity, 'N/A') as capacity, buy_price
     from calc.buy_prices_public bp
     where lower(type) = any($4::text[])
       and condition = 'Good'
       and brand ilike any($1)
       and model = any($2::text[])
       and ${notBlockedSql("bp", "$3")}`,
    [site.where.brand, modelKeys, site.key, WATCH_CASH_GATE_TYPES]
  );

  return cashPayoutBlockedByCatalog(items, rows);
}

/**
 * Luxury handbags never qualify for Direct EFT. Looked up by catalogue type,
 * not the client's claimed category, and without a price threshold.
 */
export async function catalogLuxuryHandbagCashPayoutBlocked({ site, items }) {
  const modelKeys = submittedModelKeys(items);
  if (!modelKeys.length) return false;

  const { rows } = await query(
    `select brand, type, model, coalesce(capacity, 'N/A') as capacity, buy_price
     from calc.buy_prices_public bp
     where lower(type) = $4
       and brand ilike any($1)
       and model = any($2::text[])
       and ${notBlockedSql("bp", "$3")}`,
    [site.where.brand, modelKeys, site.key, LUXURY_HANDBAG_TYPE]
  );

  return cashPayoutBlockedByCatalog(items, rows);
}

export async function catalogCashPayoutBlocked({ site, items }) {
  let handbagBlocked = false;
  let watchBlocked = false;
  try {
    handbagBlocked = await catalogLuxuryHandbagCashPayoutBlocked({ site, items });
  } catch (err) {
    console.error("luxury handbag cash gate lookup failed", err);
  }
  try {
    watchBlocked = await catalogLuxuryWatchCashPayoutBlocked({ site, items });
  } catch (err) {
    console.error("luxury watch cash gate lookup failed", err);
  }
  if (handbagBlocked) return "handbag";
  if (watchBlocked) return "watch";
  return null;
}
