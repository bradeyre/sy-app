# Mount the partners lander on WordPress

Production is a WordPress page, same ops pattern as `/sell/`: GenerateBlocks Custom HTML on `epicdeals.co.za`. The Next route `/partners/trade-in` is a **preview** only. Do not reverse-proxy this app as the public page.

sy-app stays calculator-only. This folder is the paste package for Coder.

Chair lock: public slug is `/partners/trade-in-as-payment/`. Old `/partners/trade-in/` 301s to it. H1 is exactly `Pay with the stuff they already own.`

## Page

| Field | Value |
| --- | --- |
| Title | Trade-in as payment |
| Slug | `partners/trade-in-as-payment` |
| Public URL | https://epicdeals.co.za/partners/trade-in-as-payment/ |
| Redirect | 301 `/partners/trade-in/` → `/partners/trade-in-as-payment/` (Yoast or Rank Math, or a thin WP page) |
| Template | Same thin GenerateBlocks canvas as `/sell/` |
| Sitemap | Yoast on epicdeals. Submit the new URL. sy-app has no sitemap. |

If `/partners/trade-in/` already exists as a page, change its slug (or create the new page and point the old one at it). Do not leave both indexable.

## Yoast

**SEO title:** `White-label trade-in as payment for SA retail | Epic Deals`

**Meta description:** `Let customers pay with the phone, Dyson, watch or console they already own. White-label calculator, powered by Epic Deals. Looking for pilot partners.`

**Canonical:** `https://epicdeals.co.za/partners/trade-in-as-payment/`

**Social image:** upload `public/partners/og-trade-in.png` (1200×630) from this repo to Media, then set it as the Yoast Facebook/Twitter image. Alt text: `Pay with the stuff they already own`.

`lang` on the page should stay `en-ZA`.

## GenerateBlocks

1. Open the **new** page → Custom HTML block.
2. Paste **all** of `public/partners/trade-in-wp-block.html`. It is HTML + CSS only.
3. Do **not** paste a `<script>` tag into that block. Cloudflare WAF on this host rejects update bodies that look like injected JavaScript and WordPress reports `Updating failed. The response is not a valid JSON response.` The calculator already works around this with `public/embed.js`.
4. Save. Check 375px and desktop. No horizontal scroll. Primary CTA is full-width in the hero; a sticky apply bar holds the thumb zone until `#apply`.

If the theme restyles headings, the `.ep` prefix is the reset. Additional CSS is a last resort, not a second design.

## Form

The pasted form POSTs to `https://sym-calculator.vercel.app/api/partners/trade-in`.

Keep that path. The public page slug changed; the API name did not.

- Native POST works without JavaScript and returns a small thanks page.
- Optional stay-on-page UX: add a **separate** Custom HTML block that contains only:

```html
<script src="https://sym-calculator.vercel.app/partners/trade-in-form.js" defer></script>
```

A `src` tag saves. Inline JS does not.

Airtable is a no-op until `AIRTABLE_PARTNERS_BASE_ID` and `AIRTABLE_PARTNERS_TABLE_ID` are set on the calculator deploy (plus the existing `AIRTABLE_API_KEY`). Leads still log. Do not point this form at the consumer buyback table.

Mailto fallback: `sell@epicdeals.co.za`.

## JSON-LD (Yoast / schema plugin, not the HTML block)

Paste as one graph. FAQ answers must match the visible FAQ.

```json
{
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://epicdeals.co.za/#organization",
      "name": "Epic Deals",
      "url": "https://epicdeals.co.za",
      "email": "sell@epicdeals.co.za",
      "telephone": "+27-10-900-1258",
      "address": { "@type": "PostalAddress", "addressCountry": "ZA" }
    },
    {
      "@type": "WebPage",
      "@id": "https://epicdeals.co.za/partners/trade-in-as-payment/#webpage",
      "url": "https://epicdeals.co.za/partners/trade-in-as-payment/",
      "name": "White-label trade-in as payment for SA retail | Epic Deals",
      "description": "Let customers pay with the phone, Dyson, watch or console they already own. White-label calculator, powered by Epic Deals. Looking for pilot partners.",
      "inLanguage": "en-ZA",
      "isPartOf": { "@id": "https://epicdeals.co.za/#organization" },
      "publisher": { "@id": "https://epicdeals.co.za/#organization" }
    },
    {
      "@type": "FAQPage",
      "@id": "https://epicdeals.co.za/partners/trade-in-as-payment/#faq",
      "url": "https://epicdeals.co.za/partners/trade-in-as-payment/",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is this the same as Apple or Breezy trade-in?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Those subsidise new-phone upgrades. We turn the stuff they already own into a payment toward your product. Phones, yes. Also GoPro, Dyson, GHD, coffee machines, watches, consoles."
          }
        },
        {
          "@type": "Question",
          "name": "Who holds the inventory risk?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Epic, once the device passes intake."
          }
        },
        {
          "@type": "Question",
          "name": "Can we white-label the calculator?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Yes. Embed with a partner key; your colours, our engine."
          }
        },
        {
          "@type": "Question",
          "name": "How fast to pilot?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Weeks, not quarters. Manual first, then embed."
          }
        },
        {
          "@type": "Question",
          "name": "South Africa only?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Built for South Africa first: courier, banking, local categories."
          }
        }
      ]
    }
  ]
}
```

## Font

The block asks for Satoshi, then system-ui. If the Epic theme already enqueues Satoshi (the Sell Your / Epic group face), do nothing. If the page falls back to system-ui, enqueue the same five weights the calculator hosts under `public/fonts/satoshi`.

## Optional later: live calculator embed

Not required for the lander launch. When a partner page should run the real engine, add a **separate** Custom HTML block (script `src` only):

```html
<div data-sym-calculator data-site="epicdeals" data-theme="light"></div>
<script src="https://sym-calculator.vercel.app/embed.js" defer></script>
```

Do not paste the calculator into the lander HTML file. Keep the marketing block and the embed block apart so a WAF failure on one cannot take down the other.

## Preview vs production

| Surface | URL | Job |
| --- | --- | --- |
| WordPress | https://epicdeals.co.za/partners/trade-in-as-payment/ | Public page, Yoast, sitemap |
| Old WP URL | https://epicdeals.co.za/partners/trade-in/ | 301 only |
| sy-app preview | `/partners/trade-in` on the calculator deploy | Design + form API |
| Form API | `POST /api/partners/trade-in` | Unchanged |

The preview canonical points at the WordPress URL so the two do not compete.
