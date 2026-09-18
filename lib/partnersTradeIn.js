/**
 * Copy, schema and validation for the Epic Partners lander.
 *
 * Production: WordPress at epicdeals.co.za/partners/trade-in-as-payment/
 * (301 from /partners/trade-in/). The Next route `/partners/trade-in` is
 * a design preview only. Form POST stays /api/partners/trade-in.
 */

export const CANONICAL_URL = "https://epicdeals.co.za/partners/trade-in-as-payment/";
export const LEGACY_URL = "https://epicdeals.co.za/partners/trade-in/";
export const OG_IMAGE_PATH = "/partners/og-trade-in.png";
export const SITE_ORIGIN = "https://epicdeals.co.za";
export const PREVIEW_ORIGIN = "https://sym-calculator.vercel.app";
export const FORM_POST_PATH = "/api/partners/trade-in";

export const SEO = {
  title: "White-label trade-in as payment for SA retail | Epic Deals",
  description:
    "Let customers pay with the phone, Dyson, watch or console they already own. White-label calculator, powered by Epic Deals. Looking for pilot partners.",
  ogAlt: "Pay with the stuff they already own",
};

export const HERO = {
  h1: "Pay with the stuff they already own.",
  lede: "A payment method, not a phone-upgrade side quest. They put the Dyson, the GoPro, the old PlayStation on the bill. You sell the couch.",
};

export const AWKWARD = {
  h2: "The awkward truth",
  body: "Most carts die because the money is sitting in a cupboard. Last year's phone. The coffee machine. The watch they upgraded from. Trade-in as payment unlocks that liquidity at checkout, not after a sell-then-buy dance.",
};

export const WHO = {
  yesTitle: "Retail with a real ticket",
  yesBody:
    "Furniture, appliances, fashion, specialty retail, e-comm. AOV high enough that a used phone, a laptop, or a Dyson meaningfully closes the gap.",
  noTitle: "Not phone-upgrade financing",
  noBody:
    "That is a different game. We do not pretend to be Breezy, and we will not claim to beat them on new-phone trade-in credit.",
};

export const EMBED = {
  h2: "Your colours. Our engine.",
  body: "The live calculator already embeds on partner-style pages. A partner key keeps the quote engine ours and the chrome yours. Phones, yes. Also the cupboard.",
  chips: ["Phone", "MacBook", "Console", "GoPro", "Dyson", "GHD", "Watch", "Coffee"],
};

export const CATEGORIES = [
  "Furniture",
  "Appliances",
  "Fashion",
  "Specialty retail",
  "E-commerce",
  "Other",
];

export const MONTHLY_ORDERS = ["Under 50", "50-200", "200-1 000", "1 000+"];

export const ROLES = ["Founder / owner", "Marketing", "E-commerce", "Operations", "Other"];

export const HOW = {
  h2: "How the payment method works",
  body: "They pay with stuff they already own. We liquidate it. You are not in the second-hand business.",
};

export const HOW_STEPS = [
  {
    n: "01",
    title: "They pick your product",
    body: "A couch, a fridge, a jacket. The thing they came to buy from you.",
  },
  {
    n: "02",
    title: "Instant quote on their stuff",
    body: "Phones, MacBooks, consoles, GoPro, Dyson, GHD, coffee machines, luxury watches. Inside your flow, not a detour.",
  },
  {
    n: "03",
    title: "Epic funds the cash base",
    body: "The Good buyback comes off our P&L. You are not running a second-hand desk.",
  },
  {
    n: "04",
    title: "You can top up",
    body: "Optional subsidy from your SKU margin. You set it. You can turn it off.",
  },
  {
    n: "05",
    title: "The kit ships to Epic",
    body: "We take intake, fraud and liquidation. You keep the sale.",
  },
];

export const NEVER_ITEMS = [
  "No grading lab.",
  "No buyback P&L.",
  "No fraud desk.",
  "No “what is this cracked iPhone or half-dead Dyson worth” spreadsheet.",
];

export const ECONOMICS = [
  {
    title: "Epic pays the Good cash base",
    body: "That is our buyback, from our book. Not a loan against a new phone.",
  },
  {
    title: "You may add a top-up",
    body: "From your product margin, if you want the deal to close harder. Optional.",
  },
  {
    title: "A clear fee to Epic",
    body: "We run intake and liquidate the device. You see the number before you pilot.",
  },
  {
    title: "One line at checkout",
    body: "The customer sees a payment method, not a black box of trade-in maths.",
  },
];

export const FAQ = [
  {
    q: "Is this the same as Apple or Breezy trade-in?",
    a: "No. Those subsidise new-phone upgrades. We turn the stuff they already own into a payment toward your product. Phones, yes. Also GoPro, Dyson, GHD, coffee machines, watches, consoles.",
  },
  {
    q: "Who holds the inventory risk?",
    a: "Epic, once the device passes intake.",
  },
  {
    q: "Can we white-label the calculator?",
    a: "Yes. Embed with a partner key; your colours, our engine.",
  },
  {
    q: "How fast to pilot?",
    a: "Weeks, not quarters. Manual pilot first, then embed.",
  },
  {
    q: "South Africa only?",
    a: "Built for South Africa first: courier, banking, local categories.",
  },
];

export const PROOF_STATS = [
  { value: "2014", label: "Trading since" },
  { value: "R90m+", label: "Paid to South Africans for old tech" },
  { value: "2,500+", label: "Reviews" },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const URL_RE = /^(https?:\/\/)?([a-z0-9-]+\.)+[a-z]{2,}(\/.*)?$/i;

function trim(value) {
  return String(value ?? "").trim();
}

export function normaliseWebsite(value) {
  const raw = trim(value);
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

export function normalisePhone(value) {
  return String(value ?? "").replace(/[^\d+]/g, "");
}

export function isLikelySaPhone(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("27") && digits.length === 11) return true;
  if (digits.startsWith("0") && digits.length === 10) return true;
  return digits.length >= 9 && digits.length <= 12;
}

/**
 * Shared field rules for the preview form and the API.
 * Returns `{ ok, errors, data }` with `data` only when ok.
 */
export function validatePartnerLead(input) {
  const errors = {};
  const name = trim(input.name);
  const company = trim(input.company);
  const website = trim(input.website);
  const role = trim(input.role);
  const email = trim(input.email).toLowerCase();
  const phone = trim(input.phone);
  const monthlyOrders = trim(input.monthlyOrders);
  const message = trim(input.message);
  const honeypot = trim(input.honeypot);

  const categories = Array.isArray(input.categories)
    ? input.categories.map(trim).filter(Boolean)
    : typeof input.categories === "string"
      ? input.categories
          .split(",")
          .map(trim)
          .filter(Boolean)
      : [];

  if (name.length < 2 || name.length > 80) errors.name = "Enter your name.";
  if (company.length < 2 || company.length > 120) errors.company = "Enter your company.";
  if (!website || !URL_RE.test(website)) errors.website = "Enter a website.";
  if (!role) errors.role = "Enter your role.";
  if (!EMAIL_RE.test(email)) errors.email = "Enter a work email.";
  if (!isLikelySaPhone(phone)) errors.phone = "Enter a South African phone number.";
  if (!MONTHLY_ORDERS.includes(monthlyOrders)) {
    errors.monthlyOrders = "Choose an order volume.";
  }
  if (categories.length === 0) errors.categories = "Pick at least one category.";
  if (message.length > 2000) errors.message = "Keep the note under 2 000 characters.";

  if (Object.keys(errors).length) return { ok: false, errors, honeypot: Boolean(honeypot) };

  return {
    ok: true,
    errors: {},
    honeypot: Boolean(honeypot),
    data: {
      name,
      company,
      website: normaliseWebsite(website),
      role,
      email,
      phone: normalisePhone(phone),
      monthlyOrders,
      categories,
      message,
    },
  };
}

export function buildJsonLd() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_ORIGIN}/#organization`,
        name: "Epic Deals",
        url: SITE_ORIGIN,
        email: "sell@epicdeals.co.za",
        telephone: "+27-10-900-1258",
        address: {
          "@type": "PostalAddress",
          addressCountry: "ZA",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${CANONICAL_URL}#webpage`,
        url: CANONICAL_URL,
        name: SEO.title,
        description: SEO.description,
        inLanguage: "en-ZA",
        isPartOf: { "@id": `${SITE_ORIGIN}/#organization` },
        publisher: { "@id": `${SITE_ORIGIN}/#organization` },
      },
      {
        "@type": "FAQPage",
        "@id": `${CANONICAL_URL}#faq`,
        url: CANONICAL_URL,
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };
}
