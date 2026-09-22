// Sends the buy-back confirmation email via Resend's REST API, same
// server-side-only, fetch-based pattern as lib/storage.js. Best-effort: a
// failed send never blocks the lead being recorded, it's just logged.
import { formatZAR } from "@/lib/format";
import { HANDBAG_MISS_COPY, HANDBAG_MISS_NOTIFY_TO } from "@/lib/luxuryHandbagMiss";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.LEAD_EMAIL_FROM || "Epic Deals <sell@epicdeals.co.za>";
const PARTNERS_NOTIFY_TO = ["brad@epicdeals.co.za", "wesley@epicdeals.co.za"];

const PAYMENT_LABELS = {
  consignment: "Epic Deals Consignment",
  voucher: "Epic Deals Voucher",
  eft: "EFT",
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// No per-item rand amounts here on purpose, the calculator itself never
// shows a price until the final animated reveal, so the confirmation email
// mirrors that and only lists what's being sold, not a running total that'd
// undercut the one-total-at-the-end moment.
function itemsToRows(items) {
  return items
    .map(
      (i) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #E6F5FF;color:#0A1628;font-size:14px;">
            ${i.model}${i.capacity && i.capacity !== "N/A" ? ` (${i.capacity})` : ""} &mdash; ${i.condition}
            ${i.accessories?.length ? `<br/><span style="color:#64748B;font-size:12px;">${i.accessories.map((a) => a.label).join(", ")}</span>` : ""}
          </td>
        </tr>`
    )
    .join("");
}

function buildHtml({ fullName, items, quotedTotal, paymentPreference, leadId }) {
  const firstName = (fullName || "").trim().split(" ")[0] || "there";
  const paymentLabel = PAYMENT_LABELS[paymentPreference] || null;
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0A1628;">
    <div style="height:4px;width:48px;background:#00A2FF;border-radius:999px;margin-bottom:20px;"></div>
    <h1 style="font-size:20px;margin:0 0 12px;">Thanks, ${firstName}, we've got your offer</h1>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 20px;">
      Your quote is confirmed and on file (reference #${leadId}). No obligation, nothing to sign yet, we'll be in touch shortly to arrange collection.
    </p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${itemsToRows(items)}
    </table>
    <div style="display:flex;justify-content:space-between;align-items:center;border-top:2px solid #00A2FF;padding-top:12px;">
      <span style="font-size:14px;font-weight:600;color:#334155;">Total offer${paymentLabel ? ` (${paymentLabel})` : ""}</span>
      <span style="font-size:20px;font-weight:700;color:#0A1628;">${formatZAR(quotedTotal)}</span>
    </div>
    <p style="font-size:13px;color:#64748B;line-height:1.6;margin-top:24px;">
      Questions in the meantime? Just reply to this email, it comes straight to our team.
    </p>
    <p style="font-size:12px;color:#94A3B8;margin-top:32px;">Epic Deals &middot; sell@epicdeals.co.za</p>
  </div>`;
}

function buildPartnersPilotHtml(lead) {
  const categories = Array.isArray(lead.categories) ? lead.categories.join(", ") : lead.categories || "";
  const rows = [
    ["Name", lead.name],
    ["Company", lead.company],
    ["Website", lead.website],
    ["Role", lead.role],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Monthly orders", lead.monthlyOrders],
    ["Categories", categories],
    ["Message", lead.message],
  ];

  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;vertical-align:top;color:#64748B;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;vertical-align:top;color:#0A1628;font-size:14px;white-space:pre-wrap;">${escapeHtml(value) || "—"}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A1628;">
    <div style="height:4px;width:48px;background:#00A2FF;border-radius:999px;margin-bottom:20px;"></div>
    <h1 style="font-size:18px;margin:0 0 8px;">Partners pilot lead</h1>
    <p style="font-size:13px;color:#64748B;margin:0 0 16px;">New submission from /partners/trade-in</p>
    <table style="width:100%;border-collapse:collapse;">${tableRows}</table>
  </div>`;
}

export async function sendLeadConfirmationEmail({ to, fullName, items, quotedTotal, paymentPreference, leadId }) {
  if (!RESEND_API_KEY) {
    console.warn("sendLeadConfirmationEmail skipped: RESEND_API_KEY is not set");
    return { sent: false, reason: "not_configured" };
  }
  if (!to) {
    return { sent: false, reason: "no_recipient" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to,
        subject: `Your offer is confirmed: ${formatZAR(quotedTotal)}`,
        html: buildHtml({ fullName, items, quotedTotal, paymentPreference, leadId }),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Resend send failed: ${res.status} ${text}`);
      return { sent: false, reason: "resend_error" };
    }

    return { sent: true };
  } catch (err) {
    console.error("sendLeadConfirmationEmail failed", err);
    return { sent: false, reason: "exception" };
  }
}

/**
 * Internal notify for partners trade-in pilot leads.
 * Best-effort: never throws; caller should not fail the API response on email issues.
 */
export async function sendPartnersPilotNotify(lead) {
  if (!RESEND_API_KEY) {
    console.warn("sendPartnersPilotNotify skipped: RESEND_API_KEY is not set");
    return { sent: false, reason: "not_configured" };
  }

  const company = String(lead?.company || "").trim() || "(no company)";

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: PARTNERS_NOTIFY_TO,
        subject: `[Partners pilot] ${company}`,
        html: buildPartnersPilotHtml(lead || {}),
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[partners/trade-in] Resend notify failed: ${res.status} ${text}`);
      return { sent: false, reason: "resend_error" };
    }

    return { sent: true };
  } catch (err) {
    console.error("[partners/trade-in] sendPartnersPilotNotify failed", err);
    return { sent: false, reason: "exception" };
  }
}

function missItemRows(items) {
  return (items || [])
    .map((item) => {
      const photos = (item.handbagPhotos || [])
        .map((p) => {
          const link = p.url
            ? `<a href="${escapeHtml(p.url)}">${escapeHtml(p.label || p.key || "photo")}</a>`
            : escapeHtml(p.label || p.key || p.path || "photo");
          return `<li>${link}</li>`;
        })
        .join("");
      return `
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid #E6F5FF;font-size:14px;color:#0A1628;">
            <strong>${escapeHtml(item.brand)}</strong> ${escapeHtml(item.model)}<br/>
            <span style="color:#64748B;font-size:13px;">
              Colour or material: ${escapeHtml(item.colourOrMaterial || item.colorOrMaterial || "—")}<br/>
              Condition: ${escapeHtml(item.condition || item.conditionRaw || "—")}<br/>
              Serial / authenticity card notes: ${escapeHtml(item.serialNotes || "—")}
            </span>
            ${photos ? `<ul style="margin:8px 0 0;padding-left:18px;">${photos}</ul>` : ""}
          </td>
        </tr>`;
    })
    .join("");
}

function buildHandbagMissOpsHtml({ lead, items }) {
  const rows = [
    ["Name", lead.fullName],
    ["Email", lead.email],
    ["Phone", lead.phone],
    ["Payment", PAYMENT_LABELS[lead.paymentPreference] || lead.paymentPreference],
    ["Reference", lead.quoteRef || lead.leadId],
    ["Address", [lead.address, lead.suburb, lead.city, lead.province].filter(Boolean).join(", ")],
    ["Notes", lead.notes],
  ];
  const tableRows = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:6px 12px 6px 0;vertical-align:top;color:#64748B;font-size:13px;white-space:nowrap;">${escapeHtml(label)}</td>
        <td style="padding:6px 0;vertical-align:top;color:#0A1628;font-size:14px;white-space:pre-wrap;">${escapeHtml(value) || "—"}</td>
      </tr>`
    )
    .join("");

  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#0A1628;">
    <div style="height:4px;width:48px;background:#00A2FF;border-radius:999px;margin-bottom:20px;"></div>
    <h1 style="font-size:18px;margin:0 0 8px;">Luxury Handbag miss quote</h1>
    <p style="font-size:13px;color:#64748B;margin:0 0 16px;">No Luxity estimate. Please quote the seller within 48 working hours. No cash figure was shown.</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">${tableRows}</table>
    <table style="width:100%;border-collapse:collapse;">${missItemRows(items)}</table>
  </div>`;
}

function buildHandbagMissCustomerHtml({ fullName, leadId }) {
  const firstName = (fullName || "").trim().split(" ")[0] || "there";
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#0A1628;">
    <div style="height:4px;width:48px;background:#00A2FF;border-radius:999px;margin-bottom:20px;"></div>
    <h1 style="font-size:20px;margin:0 0 12px;">Thanks, ${escapeHtml(firstName)}</h1>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 12px;">${escapeHtml(HANDBAG_MISS_COPY.thankYou)}</p>
    <p style="font-size:14px;color:#334155;line-height:1.6;margin:0 0 12px;">${escapeHtml(HANDBAG_MISS_COPY.promise48h)}</p>
    <p style="font-size:13px;color:#64748B;line-height:1.6;margin:0 0 12px;">${escapeHtml(HANDBAG_MISS_COPY.counterfeitDisclaimer)}</p>
    ${leadId ? `<p style="font-size:13px;color:#64748B;">Reference #${escapeHtml(leadId)}</p>` : ""}
    <p style="font-size:12px;color:#94A3B8;margin-top:32px;">Epic Deals &middot; sell@epicdeals.co.za</p>
  </div>`;
}

async function resendSend(payload) {
  if (!RESEND_API_KEY) return { sent: false, reason: "not_configured" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: FROM_ADDRESS, ...payload }),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`Resend send failed: ${res.status} ${text}`);
      return { sent: false, reason: "resend_error" };
    }
    return { sent: true };
  } catch (err) {
    console.error("Resend send failed", err);
    return { sent: false, reason: "exception" };
  }
}

/**
 * Ops notify for Luxury Handbag miss quotes. Best-effort; never throws.
 */
export async function sendHandbagMissOpsEmail({ lead, items, attachments } = {}) {
  if (!RESEND_API_KEY) {
    console.warn("sendHandbagMissOpsEmail skipped: RESEND_API_KEY is not set");
    return { sent: false, reason: "not_configured" };
  }
  const brand = items?.[0]?.brand || "bag";
  const model = items?.[0]?.model || "";
  return resendSend({
    to: HANDBAG_MISS_NOTIFY_TO,
    subject: `[Handbag miss quote] ${brand} ${model}`.trim(),
    html: buildHandbagMissOpsHtml({ lead: lead || {}, items }),
    ...(attachments?.length ? { attachments } : {}),
  });
}

/**
 * Customer confirm for miss-flow. Best-effort; never throws.
 */
export async function sendHandbagMissCustomerEmail({ to, fullName, leadId } = {}) {
  if (!RESEND_API_KEY) {
    console.warn("sendHandbagMissCustomerEmail skipped: RESEND_API_KEY is not set");
    return { sent: false, reason: "not_configured" };
  }
  if (!to) return { sent: false, reason: "no_recipient" };
  return resendSend({
    to,
    subject: "We've got your bag details",
    html: buildHandbagMissCustomerHtml({ fullName, leadId }),
  });
}
