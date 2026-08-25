import { NextResponse } from "next/server";
import { getSiteConfig } from "@/lib/siteConfig";
import { getClientIp } from "@/lib/clientIp";
import { isRateLimited } from "@/lib/rateLimit";
import { evaluateCoupon } from "@/lib/coupons";

export const dynamic = "force-dynamic";

// Shows the customer what a code is worth before they commit. Preview only:
// the subtotal here comes from the browser, so the figure returned is for
// display. /api/lead re-evaluates the same code against the server's own
// recomputed subtotal, and that result is what gets stored and paid.
export async function POST(request) {
  const site = await getSiteConfig({
    host: request.headers.get("host"),
    overrideKey: new URL(request.url).searchParams.get("site"),
  });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }

  // A coupon endpoint is a guessing target: without this, someone could work
  // through candidate codes as fast as the network allows.
  const ip = getClientIp(request);
  if (isRateLimited(`coupon:${site.key}:${ip}`, { max: 15 })) {
    return NextResponse.json(
      { ok: false, error: "Too many attempts, please try again a bit later" },
      { status: 429 }
    );
  }

  try {
    const result = await evaluateCoupon({
      code: body?.code,
      siteKey: site.key,
      subtotal: Number(body?.subtotal) || 0,
      // Preview only, and clamped so a silly value can't render a silly number.
      itemCount: Math.min(50, Math.max(1, Math.floor(Number(body?.itemCount) || 1))),
    });
    if (!result.ok) return NextResponse.json({ ok: false, error: result.error });
    return NextResponse.json({
      ok: true,
      code: result.code,
      description: result.description,
      bonus: result.bonus,
    });
  } catch (err) {
    console.error("POST /api/coupon failed", err);
    return NextResponse.json({ ok: false, error: "Could not check that code right now" }, { status: 500 });
  }
}
