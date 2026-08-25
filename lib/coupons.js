// Coupon / voucher codes that add money to a customer's offer.
//
// The bonus is always worked out here, on the server, from the server's own
// subtotal. The browser is told what a code is worth so the customer can see it
// before committing, but that figure is never trusted on the way back in -- the
// lead route re-evaluates from scratch.
import { query } from "@/lib/db";
import { formatZAR } from "@/lib/format";

const round2 = (n) => Math.round(n * 100) / 100;

export function normaliseCode(code) {
  return String(code || "").trim().toUpperCase().replace(/\s+/g, "");
}

// Read-only: works out what a code is worth on this basket without consuming
// it, so it's safe to call for the live preview. redeemCoupon() claims the use.
export async function evaluateCoupon({ code, siteKey, subtotal }) {
  const normalised = normaliseCode(code);
  if (!normalised) return { ok: false, error: "Enter a coupon code" };

  const { rows } = await query(
    `select id, code, description, kind, value, max_bonus, min_quote_total,
            sites, max_uses, used_count, valid_from, valid_until, active
     from calc.coupons
     where upper(code) = $1
     limit 1`,
    [normalised]
  );

  const coupon = rows[0];

  // One deliberately vague message covers "no such code" and most of the
  // disqualifying reasons below. If the wording differed, someone working
  // through guesses could tell a real-but-expired code from a made-up one.
  const invalid = { ok: false, error: "That coupon code isn't valid" };

  if (!coupon || !coupon.active) return invalid;

  const now = Date.now();
  if (coupon.valid_from && new Date(coupon.valid_from).getTime() > now) return invalid;
  if (coupon.valid_until && new Date(coupon.valid_until).getTime() < now) return invalid;

  const sites = Array.isArray(coupon.sites) ? coupon.sites : [];
  if (sites.length > 0 && !sites.includes(siteKey)) return invalid;

  // These two are worth saying plainly: the code is genuine and the customer
  // can act on the answer.
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) {
    return { ok: false, error: "That coupon has already been fully redeemed" };
  }

  const base = Number(subtotal) || 0;
  const minimum = Number(coupon.min_quote_total) || 0;
  if (base < minimum) {
    return { ok: false, error: `That coupon needs an offer of at least ${formatZAR(minimum)}` };
  }

  let bonus = coupon.kind === "fixed" ? Number(coupon.value) : (base * Number(coupon.value)) / 100;
  if (coupon.max_bonus != null) bonus = Math.min(bonus, Number(coupon.max_bonus));
  bonus = round2(Math.max(0, bonus));
  if (!(bonus > 0)) return invalid;

  return {
    ok: true,
    couponId: coupon.id,
    code: coupon.code,
    description: coupon.description || null,
    bonus,
  };
}

// Atomically claim one use. Returns false if the last use went to someone else
// between the customer seeing the code accepted and actually submitting, which
// is the only way max_uses could otherwise be overshot.
export async function claimCouponUse(couponId) {
  const { rows } = await query(
    `update calc.coupons
     set used_count = used_count + 1
     where id = $1 and (max_uses is null or used_count < max_uses)
     returning id`,
    [couponId]
  );
  return rows.length > 0;
}

export async function releaseCouponUse(couponId) {
  await query(
    `update calc.coupons set used_count = greatest(0, used_count - 1) where id = $1`,
    [couponId]
  );
}

export async function recordRedemption({ couponId, leadId, quoteRef, code, bonus }) {
  await query(
    `insert into calc.coupon_redemptions (coupon_id, lead_id, quote_ref, code, bonus_amount)
     values ($1,$2,$3,$4,$5)`,
    [couponId, leadId ?? null, quoteRef ?? null, code, bonus]
  );
}
