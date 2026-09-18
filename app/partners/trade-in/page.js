import PilotForm from "./PilotForm";
import {
  CANONICAL_URL,
  ECONOMICS,
  FAQ,
  HOW_STEPS,
  NEVER_ITEMS,
  OG_IMAGE_PATH,
  PREVIEW_ORIGIN,
  PROOF_STATS,
  SEO,
  buildJsonLd,
} from "@/lib/partnersTradeIn";

export const metadata = {
  title: SEO.title,
  description: SEO.description,
  alternates: { canonical: CANONICAL_URL },
  robots: { index: true, follow: true },
  openGraph: {
    title: SEO.title,
    description: SEO.description,
    url: CANONICAL_URL,
    siteName: "Epic Deals",
    locale: "en_ZA",
    type: "website",
    images: [
      {
        url: `${PREVIEW_ORIGIN}${OG_IMAGE_PATH}`,
        width: 1200,
        height: 630,
        alt: SEO.ogAlt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SEO.title,
    description: SEO.description,
    images: [`${PREVIEW_ORIGIN}${OG_IMAGE_PATH}`],
  },
};

export default function PartnersTradeInPage() {
  const jsonLd = buildJsonLd();

  return (
    <div className="ep" lang="en-ZA">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <a className="ep-skip" href="#apply">
        Skip to apply
      </a>

      <header className="ep-wrap ep-top">
        <p className="ep-mark">
          Epic <span>Deals</span>
        </p>
        <a className="ep-top-link" href="https://epicdeals.co.za/sell/">
          Sell your tech
        </a>
      </header>

      <main>
        <div className="ep-preform">
          <section className="ep-hero">
            <div className="ep-wrap ep-hero-grid">
              <div>
                <h1 className="ep-h1">Let them pay with the tech they already own.</h1>
                <p className="ep-lede">
                  Your storefront. Our buyback engine. They sell a MacBook, you sell a
                  couch, everybody moves.
                </p>
                <p className="ep-proof">
                  <span>Trading since 2014</span>
                  <span>R90m+ paid to South Africans for old tech</span>
                  <span>2,500+ reviews</span>
                </p>
                <div className="ep-hero-actions">
                  <a className="ep-btn" href="#apply">
                    Apply for a pilot partnership
                  </a>
                  <a className="ep-text-link" href="#embed">
                    See how the calculator embeds
                  </a>
                </div>
              </div>
              <DeviceArt />
            </div>
          </section>

          <a className="ep-btn ep-sticky" href="#apply">
            Apply for a pilot partnership
          </a>

          <section className="ep-band ep-band--canvas">
            <div className="ep-wrap">
              <h2 className="ep-h2">The awkward truth</h2>
              <p className="ep-copy">
                Most carts die because the money feels stuck in last year&apos;s phone.
                Trade-in as payment unlocks that liquidity at checkout, not after a
                separate sell-then-buy dance.
              </p>
            </div>
          </section>

          <section className="ep-section" aria-labelledby="how-heading">
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 className="ep-h2" id="how-heading">
                  How it works from your side
                </h2>
                <p className="ep-copy">
                  Inventory liquidation at checkout. Not upgrade financing against a
                  new phone.
                </p>
              </div>
              <div className="ep-steps">
                {HOW_STEPS.map((step) => (
                  <article className="ep-card" key={step.n}>
                    <span className="ep-step-n">{step.n}</span>
                    <h3>{step.title}</h3>
                    <p>{step.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="ep-section" aria-labelledby="never-heading" style={{ paddingTop: 0 }}>
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 className="ep-h2" id="never-heading">
                  What you never have to become
                </h2>
              </div>
              <ul className="ep-never">
                {NEVER_ITEMS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="ep-band ep-band--canvas" aria-labelledby="who-heading">
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 className="ep-h2" id="who-heading">
                  Who this is for
                </h2>
              </div>
              <div className="ep-split">
                <article className="ep-card">
                  <h3>Retail with a real ticket</h3>
                  <p>
                    Furniture, appliances, fashion, specialty retail, e-comm with AOV
                    high enough that a used phone or laptop meaningfully closes the gap.
                  </p>
                </article>
                <article className="ep-card ep-who--not">
                  <h3>Not phone-upgrade financing</h3>
                  <p>
                    That is a different game. We do not pretend to be Breezy, and we
                    will not claim to beat them on new-phone trade-in credit.
                  </p>
                </article>
              </div>
            </div>
          </section>

          <section className="ep-section" aria-labelledby="econ-heading">
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 className="ep-h2" id="econ-heading">
                  The economics, plain
                </h2>
              </div>
              <div className="ep-econ">
                {ECONOMICS.map((item) => (
                  <article className="ep-card" key={item.title}>
                    <h3>{item.title}</h3>
                    <p>{item.body}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="ep-section" id="embed" aria-labelledby="embed-heading" style={{ paddingTop: 0 }}>
            <div className="ep-wrap">
              <div className="ep-section-head">
                <h2 className="ep-h2" id="embed-heading">
                  Your colours. Our engine.
                </h2>
                <p className="ep-copy">
                  The live calculator already embeds on partner-style pages. A partner
                  key keeps the quote engine ours and the chrome yours.
                </p>
              </div>
              <div className="ep-embed" aria-hidden="true">
                <div className="ep-embed-bar">
                  <i className="ep-embed-dot" />
                  <i className="ep-embed-dot" />
                  <i className="ep-embed-dot" />
                  yourstore.co.za/checkout
                </div>
                <div className="ep-embed-body">
                  <div className="ep-chip-row">
                    <span className="ep-chip">Phone</span>
                    <span className="ep-chip">MacBook</span>
                    <span className="ep-chip">Galaxy</span>
                    <span className="ep-chip">Console</span>
                  </div>
                  <div className="ep-embed-cta">Get an instant offer</div>
                </div>
              </div>
            </div>
          </section>
        </div>

        <section className="ep-band ep-band--deep" aria-labelledby="proof-heading">
          <div className="ep-wrap">
            <h2 className="ep-h2" id="proof-heading">
              Trading since 2014
            </h2>
            <p className="ep-copy">
              Sell Your niche network plus Epic Deals retail. R90m+ paid out. We do
              not promise the highest cash prices in SA. Honesty converts partners.
            </p>
            <div className="ep-stats">
              {PROOF_STATS.map((stat) => (
                <p key={stat.label}>
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </p>
              ))}
            </div>
          </div>
        </section>

        <section className="ep-section" id="apply" aria-labelledby="apply-heading">
          <div className="ep-wrap" style={{ maxWidth: "40rem" }}>
            <div className="ep-section-head">
              <h2 className="ep-h2" id="apply-heading">
                Apply for a pilot
              </h2>
              <p className="ep-copy">
                Looking for a handful of retailers. Manual first, then the embed.
                Or write sell@epicdeals.co.za.
              </p>
            </div>
            <div className="ep-card">
              <PilotForm />
            </div>
          </div>
        </section>

        <section className="ep-section" aria-labelledby="faq-heading" style={{ paddingTop: 0 }}>
          <div className="ep-wrap">
            <div className="ep-section-head">
              <h2 className="ep-h2" id="faq-heading">
                Questions partners actually ask
              </h2>
            </div>
            <div className="ep-faq">
              {FAQ.map((item) => (
                <details key={item.q}>
                  <summary>{item.q}</summary>
                  <p>{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="ep-wrap ep-foot">
        <p>Epic Deals</p>
        <div className="ep-foot-row">
          <a href="https://epicdeals.co.za/">epicdeals.co.za</a>
          <a href="mailto:sell@epicdeals.co.za">sell@epicdeals.co.za</a>
          <a href="tel:+27109001258">010 900 1258</a>
          <a href="https://epicdeals.co.za/sell/">Consumer sell flow</a>
        </div>
      </footer>
    </div>
  );
}

function DeviceArt() {
  return (
    <div className="ep-art" aria-hidden="true">
      <figure>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <rect x="16" y="6" width="16" height="36" rx="3.5" />
          <path d="M22 10h4M22 38h4" />
        </svg>
      </figure>
      <figure>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <rect x="8" y="10" width="32" height="20" rx="2" />
          <path d="M6 34h36l-2 4H8z" />
        </svg>
      </figure>
      <figure>
        <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
          <path d="M10 18h8M14 14v8" />
          <circle cx="32" cy="18" r="1.4" fill="currentColor" stroke="none" />
          <circle cx="28" cy="22" r="1.4" fill="currentColor" stroke="none" />
          <path d="M9 20c-4 0-6 4-5.5 8S7 36 11 36c2.4 0 3.2-2 5-3.4 1.4-1 3-1.6 4.6-1.6h7c1.6 0 3.2.6 4.6 1.6 1.8 1.4 2.6 3.4 5 3.4 4 0 6.8-4 7.3-8S43 20 39 20z" />
        </svg>
      </figure>
    </div>
  );
}
