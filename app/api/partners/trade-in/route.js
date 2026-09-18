import { NextResponse } from "next/server";
import { getClientIp } from "@/lib/clientIp";
import { isRateLimited } from "@/lib/rateLimit";
import { validatePartnerLead } from "@/lib/partnersTradeIn";

export const dynamic = "force-dynamic";

const THANKS_HTML = `<!doctype html>
<html lang="en-ZA">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thanks | Epic Deals</title>
    <style>
      body { margin: 0; font-family: Satoshi, ui-sans-serif, system-ui, sans-serif; background: #faf9f7; color: #14161a; }
      main { min-height: 100dvh; display: grid; place-items: center; padding: 2rem; }
      section { max-width: 28rem; }
      h1 { font-size: 2rem; letter-spacing: -0.03em; }
      p { color: #626873; line-height: 1.5; }
      a { color: #006bb8; }
    </style>
  </head>
  <body>
    <main>
      <section>
        <h1>Thanks. We will reply within 2 business days.</h1>
        <p>A short note to <a href="mailto:sell@epicdeals.co.za">sell@epicdeals.co.za</a> if your timeline is tighter.</p>
      </section>
    </main>
  </body>
</html>`;

export async function POST(request) {
  const ip = getClientIp(request);
  if (isRateLimited(`partners-trade-in:${ip}`, { max: 8 })) {
    return respond(request, { error: "Too many submissions, try again later." }, 429);
  }

  let raw;
  try {
    raw = await readBody(request);
  } catch {
    return respond(request, { error: "Invalid request body." }, 400);
  }

  const checked = validatePartnerLead(raw);
  if (!checked.ok) {
    return respond(request, { error: "Check the highlighted fields.", errors: checked.errors }, 400);
  }

  const startedAt = Number(raw.startedAt);
  const tooFast = Number.isFinite(startedAt) && Date.now() - startedAt < 2000;
  const isSpam = checked.honeypot || tooFast;

  const payload = {
    source: "partners-trade-in",
    receivedAt: new Date().toISOString(),
    ip,
    spam: isSpam,
    ...checked.data,
  };

  console.info("[partners/trade-in] lead", JSON.stringify(payload));

  if (!isSpam) {
    await storeInAirtableIfConfigured(payload);
  }

  return respond(request, { ok: true });
}

async function readBody(request) {
  const type = request.headers.get("content-type") || "";
  if (type.includes("application/json")) {
    return await request.json();
  }
  const form = await request.formData();
  return {
    name: form.get("name"),
    company: form.get("company"),
    website: form.get("website"),
    role: form.get("role"),
    email: form.get("email"),
    phone: form.get("phone"),
    monthlyOrders: form.get("monthlyOrders"),
    categories: form.getAll("categories"),
    message: form.get("message"),
    honeypot: form.get("honeypot") || form.get("company_fax"),
    startedAt: form.get("startedAt"),
  };
}

function wantsJson(request) {
  const accept = request.headers.get("accept") || "";
  const type = request.headers.get("content-type") || "";
  return accept.includes("application/json") || type.includes("application/json");
}

function respond(request, body, status = 200) {
  if (wantsJson(request)) {
    return NextResponse.json(body, { status });
  }
  if (body.ok) {
    return new NextResponse(THANKS_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
  return NextResponse.json(body, { status });
}

/**
 * TODO: create an Airtable partners waitlist base/table, then set
 * AIRTABLE_PARTNERS_BASE_ID and AIRTABLE_PARTNERS_TABLE_ID.
 * Reuses AIRTABLE_API_KEY when present. Missing env is a no-op so a
 * missing base cannot block ship.
 */
async function storeInAirtableIfConfigured(payload) {
  const apiKey = process.env.AIRTABLE_API_KEY;
  const baseId = process.env.AIRTABLE_PARTNERS_BASE_ID;
  const tableId = process.env.AIRTABLE_PARTNERS_TABLE_ID;
  if (!apiKey || !baseId || !tableId) return;

  const response = await fetch(`https://api.airtable.com/v0/${baseId}/${tableId}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fields: {
        Name: payload.name,
        Company: payload.company,
        Website: payload.website,
        Role: payload.role,
        Email: payload.email,
        Phone: payload.phone,
        "Monthly orders": payload.monthlyOrders,
        Categories: payload.categories.join(", "),
        Message: payload.message,
        Source: payload.source,
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("[partners/trade-in] Airtable write failed", response.status, detail);
  }
}
