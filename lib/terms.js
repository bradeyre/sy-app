/**
 * The one copy of the seller terms and conditions.
 *
 * Every storefront used to carry its own terms page, hand-copied from the
 * last one, and the calculator's accept checkbox linked all five tenants to
 * sellyouriphone's copy. So a seller on sellyourgalaxy or epicdeals agreed
 * to terms branded for a different site, and changing a clause meant five
 * edits in four repos plus WordPress, two of them on a Vercel account Claude
 * Code cannot deploy.
 *
 * Now the text lives here only. It is served three ways:
 *   - /terms?site=<key>      a standalone page, which the checkbox links to
 *   - /api/terms?site=<key>  the rendered HTML, which each storefront's
 *                            /terms-and-conditions page fetches and shows
 *                            inside its own layout
 *
 * Edit a clause here, deploy the calculator, and every site follows within
 * the storefronts' revalidate window. Bump TERMS_UPDATED when the wording
 * changes, because it is printed on every copy.
 *
 * The contracting party on every tenant is Recommerce SA (Pty) Ltd t/a Epic
 * Deals, the group's buyback company. Per-tenant differences are limited to
 * name, domain and contact address, all from calc.site_config. The
 * account-lock wording names iCloud, Google
 * and Samsung on every site rather than varying by brand, so it stays true
 * on Epic Deals, which sells all of them.
 */

export const TERMS_UPDATED = "2026-09-14";

const esc = (s) =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** Numbered clause: a heading and one or more paragraphs. */
const clause = (title, ...paras) =>
  `<div class="terms-clause"><h3>${title}</h3>${paras.map((p) => `<p>${p}</p>`).join("")}</div>`;

/** Sub-clause paragraph with a bold label, e.g. "9.3 Data Removal:". */
const sub = (label, text) => `<strong>${label}</strong> ${text}`;

function contactEmail(site) {
  // Epic Deals takes sales mail on sell@, the niche sites on sales@.
  return site.key === "epicdeals" ? "sell@epicdeals.co.za" : `sales@${site.domain}`;
}

function formatDate(iso) {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Render the terms for a tenant as an HTML fragment of plain semantic tags
 * (section, h2, h3, p, strong, a). No classes the host must know about
 * beyond `terms-clause`: each host styles the tags from its own wrapper.
 */
export function renderTermsHtml(site) {
  const name = esc(site.siteName);
  const email = esc(contactEmail(site));

  const buyback = [
    clause(
      "1. Account-Locked Devices",
      "We cannot test, or pay for, a device that is still locked to an iCloud, Google or Samsung account, or any other user account. You are welcome to send one to us anyway. We will hold it and contact you so you can unlock it remotely, which you can do at any time without having the device in front of you, and payment follows as soon as it is unlocked. Until then the sale cannot be completed. If it is never unlocked we are not able to buy it, and returning it carries a R250 courier fee."
    ),
    clause(
      "2. Blacklisted or Stolen Devices",
      "Any device found to be blacklisted or reported stolen will be handed over to the South African Police Service (SAPS), along with the sender's details."
    ),
    clause(
      "3. Contract Devices",
      "Devices still under contract cannot be purchased, as the service provider remains the legal owner until the contract is fully paid off."
    ),
    clause(
      "4. Sealed Devices",
      "A valid proof of purchase is required for any sealed device to verify the legitimacy of the product. If you wish to sell three or more sealed devices in one batch, one device must be unsealed by our technician team to confirm its contents."
    ),
    clause(
      "5. Data Erasure (POPIA)",
      sub("5.1", "To meet our obligations under the Protection of Personal Information Act 4 of 2013 (POPIA), we are required to wipe and permanently erase all data on every device we receive. If we didn't, anyone who later handles the device could get to your personal information."),
      sub("5.2", "By sending us a device, you agree that it will be factory reset and that everything on it will be permanently erased, including photos, messages, contacts, accounts, apps and files. We will not ask for your permission again before doing this."),
      sub("5.3", "Please back up your data, sign out of all accounts and remove any SIM or memory cards before you send your device. We do not make backups, and erased data cannot be recovered."),
      sub("5.4", "Epic Deals accepts no liability for any data lost as a result of this erasure.")
    ),
    clause(
      "6. Dead or Non-Working Devices",
      "If a non-working (&quot;dead&quot;) device is received, we may attempt to repair it immediately. If successful and the device is account-locked, we will request account unlock credentials and the screen lock code (if applicable). Payment will only be made once the device is fully unlocked.",
      "<strong>We do not purchase liquid-damaged devices under any circumstances.</strong> This includes devices that have dried out and appear to work normally. Liquid contact is permanent, is detectable on inspection, and continues to corrode internal components long afterwards, so we cannot resell such a device with a warranty behind it. Our online calculator declines these before an offer is made. If a liquid-damaged device is sent to us regardless, no offer will be made and a Return fee of R250 will be charged to courier it back to you."
    ),
    clause(
      "7. Buying Back Your Device",
      "Should the seller wish to repurchase the repaired device, they may do so at 20% below the current market value. This must be arranged and paid for within 7 working days, or the device will be listed for public sale."
    ),
    clause(
      "8. Offers and Final Decisions",
      "Quotes provided on our website are non-binding. Epic Deals reserves the right to change or decline the purchase of any device. Pricing on the website is also not always correct, as an incorrect price can be the cause of human error. If it is not strategically viable for us to proceed with the model at the time, we will inform you on the morning of the collection once the submission is being reviewed."
    ),
    clause(
      "9. Incorrect Descriptions",
      "If the received device differs significantly from the description provided, a revised offer may be issued. Should the seller reject this offer, a R250 courier fee will apply to return the device. Should an offer not be made, an agent will reach out with information on the return process."
    ),
    clause(
      "10. Submission as VAT264 Form",
      "Submitting your device through our website serves as a digital VAT264 form. By submitting, you confirm that you are selling a secondhand product, and your name will be used as a digital signature."
    ),
    clause(
      "11. Unclaimed Devices",
      "If no communication is received from the original owner within 3 months of us receiving the device, we reserve the right to sell or recycle it. This policy helps cover administrative, storage, and handling costs. Ownership claims will no longer be accepted after this period."
    ),
    clause(
      "12. Shipping the parcel to Us",
      "We have insurance for when a device is stolen or missing, once collected by The Courier Guy, if it is collected under our waybill number. We will not be held liable should the device arrive damaged if it is damaged during transit. Our clients are responsible for ensuring packaging is secure. Our clients will also be asked to take an image of both the packaging of the device and the driver taking the parcel."
    ),
  ];

  const consignment = [
    clause(
      "1. Definitions",
      "&quot;The Consignor&quot;: The lawful owner of the device or their duly authorized representative. &quot;Epic Deals&quot;: Recommerce SA (Pty) Ltd trading as Epic Deals. &quot;The Device&quot;: The electronic device submitted by the Consignor for sale. &quot;Consignment Period&quot;: A period of 30 calendar days from the date of intake. &quot;Minimum Net Payout&quot;: The guaranteed minimum amount payable to the Consignor after all fees and deductions, subject to the device meeting the assessment criteria."
    ),
    clause(
      "2. Nature of Service",
      sub("2.1 Agency:", "You appoint Epic Deals as your exclusive agent to market, display, test, and sell the device to third-party buyers."),
      sub("2.2 Retention of Title:", "Ownership of the device remains with the Consignor until a valid sale is concluded and payment is received by Epic Deals."),
      sub("2.3 Warranty Responsibility:", "Upon sale, Epic Deals assumes responsibility for the warranty provided to the end-user (excluding blacklisting/network blocking). Any existing warranties held by the Consignor are deemed void or superseded upon sale.")
    ),
    clause(
      "3. Eligibility &amp; Assessment",
      sub("3.1 Grading Requirements:", "Consignment is strictly limited to devices assessed by Epic Deals as Grade A (Mint), Grade B (Good), or Sealed/New. We do not accept devices with cracked screens, significant damage, or internal faults for consignment."),
      sub("3.2 Right to Decline:", "The &quot;Consignment Offer&quot; provided prior to inspection is indicative. Epic Deals reserves the right to withdraw the offer or adjust the Minimum Net Payout after physical assessment if the device does not meet our quality standards."),
      sub("3.3 Authentication:", "You must provide a valid South African ID (or Passport). For sealed/new devices, valid Proof of Purchase is mandatory.")
    ),
    clause(
      "4. Ownership &amp; Legal Compliance",
      sub("4.1 Warranty of Title:", "You warrant that you are the sole lawful owner of the device and that it is not stolen, financed, contract-locked, blacklisted, or subject to any third-party claim."),
      sub("4.2 Stolen Goods Protocol:", "If a device is found to be stolen or linked to criminal activity, Epic Deals will immediately detain the device, the matter will be reported to SAPS, and the Consignor bears all risk, liability, and legal costs associated with such claims.")
    ),
    clause(
      "5. Intake &amp; Condition",
      sub("5.1 Condition Report:", "Upon intake, Epic Deals will record the physical condition, battery health, and functional status."),
      sub("5.2 Accessories:", "Only accessories explicitly listed on the Intake Form (e.g. Box, Charger) are acknowledged. Epic Deals accepts no liability for unlisted accessories left with the device.")
    ),
    clause(
      "6. Consignment Period &amp; Expiry",
      sub("6.1 Duration:", "This agreement is valid for 30 calendar days from the Intake Date."),
      sub("6.2 Unsold Devices:", "If the device has not sold by the end of the Consignment Period, Epic Deals may, at its sole discretion, return the device to the Consignor (at Epic Deals' cost) or offer to purchase the device outright at a pre-agreed &quot;Fallback Buy Price.&quot;")
    ),
    clause(
      "7. Pricing &amp; Payouts",
      sub("7.1 Pricing Authority:", "Epic Deals determines the listing price based on market data. We may apply discounts to facilitate a sale, provided the payout to you does not fall below the agreed Minimum Net Payout."),
      sub("7.2 Sale Completion:", "A sale is deemed &quot;Completed&quot; only when the end-user's funds have fully cleared in the Epic Deals bank account or payment gateway."),
      sub("7.3 Payout Timeline:", "Payouts are processed via EFT within 3 business days of Sale Completion."),
      sub("7.4 Banking Details:", "It is the Consignor's responsibility to provide accurate banking details. Epic Deals is not liable for payments made to incorrect accounts provided by the Consignor.")
    ),
    clause(
      "8. Repairs &amp; Refurbishment",
      sub("8.1 Consent Required:", "No repairs will be undertaken without your written approval (via email or WhatsApp)."),
      sub("8.2 Repair Costs:", "If you approve a repair to make the device saleable, Epic Deals will cover the upfront cost, which will then be deducted from your final payout.")
    ),
    clause(
      "9. Risk, Liability &amp; Data",
      sub("9.1 Custody:", "While the device is in our possession, Epic Deals assumes liability for loss due to theft or accidental physical damage caused by our staff."),
      sub("9.2 Hidden Defects:", "Epic Deals is not liable for inherent hardware/software faults (e.g. motherboard failure, &quot;Touch IC&quot; issues) that were not detectable during standard testing but manifest during storage."),
      sub("9.3 Data Removal:", "You must remove all security locks (iCloud, Google FRP, Samsung account) and back up your data. As set out in clause 5 of the Buyback Terms, the device will be wiped and all data permanently erased to comply with POPIA, and Epic Deals accepts no liability for data loss."),
      sub("9.4 POPIA Consent:", "You consent to Epic Deals storing your personal information strictly for transaction verification, warranty management, and legal compliance (Second-Hand Goods Act).")
    ),
    clause(
      "10. Cancellation &amp; Early Termination",
      sub("10.1 Voluntary Withdrawal:", "You may request the return of your device before the 30-day expiry, provided the device is not currently in an active sale transaction."),
      sub("10.2 Fees:", "Early termination is subject to a R250.00 Handling &amp; Assessment Fee. Courier costs for the return are for the Consignor's account.")
    ),
    clause(
      "11. Indemnity",
      "The Consignor hereby indemnifies and holds Recommerce SA (Pty) Ltd (t/a Epic Deals) harmless against any claims, losses, or legal actions arising from defective title, outstanding finance, ownership disputes, or misrepresentation of the device's condition."
    ),
    clause(
      "12. Governing Law",
      "These Terms &amp; Conditions are governed by the laws of the Republic of South Africa. The parties consent to the jurisdiction of the competent courts of Johannesburg."
    ),
  ];

  return [
    `<p class="terms-intro">Effective terms for ${name} buyback and consignment services. Last updated ${formatDate(TERMS_UPDATED)}.</p>`,
    `<section id="buyback"><h2>Buyback Terms and Conditions</h2><p>These terms apply when you sell a device to Recommerce SA (Pty) Ltd trading as Epic Deals (&quot;Epic Deals&quot;, &quot;we&quot;, &quot;us&quot;), including through ${name}.</p>${buyback.join("")}</section>`,
    `<section id="consignment"><h2>Consignment Terms and Conditions</h2><p>By submitting a device to Epic Deals for consignment sale, you (the &quot;Consignor&quot;) agree to be bound by the following Terms and Conditions. These terms constitute the entire agreement between the parties.</p>${consignment.join("")}</section>`,
    `<p class="terms-contact">For questions about these terms, please contact us at <a href="mailto:${email}">${email}</a> or call 010 900 3363.</p>`,
  ].join("");
}
