# Mount the partners lander on WordPress

Production is a WordPress page, same ops pattern as `/sell/`: GenerateBlocks Custom HTML on `epicdeals.co.za`. The Next route `/partners/trade-in` is a **preview** only. Do not reverse-proxy this app as the public page.

sy-app stays calculator-only. This folder is the paste package for Coder.

## Page

| Field | Value |
| --- | --- |
| Title | Trade-in as payment |
| Slug | `partners/trade-in` |
| Public URL | https://epicdeals.co.za/partners/trade-in/ |
| Template | Same thin GenerateBlocks canvas as `/sell/` |
| Sitemap | Yoast on epicdeals. sy-app has no sitemap; do not add one here. |

## Yoast

**SEO title:** `White-label trade-in & payment for SA retailers | Epic Deals`

**Meta description:** `Let customers pay with the phone, MacBook or console they already own. White-label calculator, powered by Epic Deals. Looking for pilot partners.`

**Canonical:** `https://epicdeals.co.za/partners/trade-in/`

**Social image:** upload `public/partners/og-trade-in.png` (1200×630) from this repo to Media, then set it as the Yoast Facebook/Twitter image. Alt text: `Pay with the tech they already own`.

`lang` on the page should stay `en-ZA`.

## GenerateBlocks

1. Open the page → Custom HTML block.
2. Paste **all** of `public/partners/trade-in-wp-block.html`. It is HTML + CSS only.
3. Do **not** paste a `<script>` tag into that block. Cloudflare WAF on this host rejects update bodies that look like injected JavaScript and WordPress reports `Updating failed. The response is not a valid JSON response.` The calculator already works around this with `public/embed.js`.
4. Save. Check 375px and desktop. No horizontal scroll. Primary CTA is full-width in the hero; a sticky apply bar holds the thumb zone until `#apply`.

If the theme restyles headings, the `.ep` prefix is the reset. Additional CSS is a last resort, not a second design.

## Form

The pasted form POSTs to `https://sym-calculator.vercel.app/api/partners/trade-in`.

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
      "@id": "https://epicdeals.co.za/partners/trade-in/#webpage",
      "url": "https://epicdeals.co.za/partners/trade-in/",
      "name": "White-label trade-in & payment for SA retailers | Epic Deals",
      "description": "Let customers pay with the phone, MacBook or console they already own. White-label calculator, powered by Epic Deals. Looking for pilot partners.",
      "inLanguage": "en-ZA",
      "isPartOf": { "@id": "https://epicdeals.co.za/#organization" },
      "publisher": { "@id": "https://epicdeals.co.za/#organization" }
    },
    {
      "@type": "FAQPage",
      "@id": "https://epicdeals.co.za/partners/trade-in/#faq",
      "url": "https://epicdeals.co.za/partners/trade-in/",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "Is this the same as Apple or Breezy trade-in?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No. Those subsidise new-phone upgrades. We liquidate the customer's old tech so they can buy your product."
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
| WordPress | https://epicdeals.co.za/partners/trade-in/ | Public page, Yoast, sitemap |
| sy-app preview | `/partners/trade-in` on the calculator deploy | Design + form API + screenshots |

The preview canonical points at the WordPress URL so the two do not compete.
