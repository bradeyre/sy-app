// Sends the buy-back confirmation email via Resend's REST API, same
// server-side-only, fetch-based pattern as lib/storage.js. Best-effort: a
// failed send never blocks the lead being recorded, it's just logged.
import { formatZAR } from "@/lib/format";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_ADDRESS = process.env.LEAD_EMAIL_FROM || "Epic Deals <sell@epicdeals.co.za>";

const PAYMENT_LABELS = {
  consignment: "Epic Deals Consignment",
  voucher: "Epic Deals Voucher",
  eft: "EFT",
};

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
