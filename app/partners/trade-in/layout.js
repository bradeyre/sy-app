import "./partners.css";

/**
 * Preview-only shell for /partners/trade-in.
 *
 * Production is the WordPress page at epicdeals.co.za/partners/trade-in/.
 * Pin light + group blue here so a dark OS or an epicdeals host (which
 * otherwise sets data-site and #1e73be) cannot restyle this lander or
 * leak into the calculator embed on `/`.
 */
const PIN_LIGHT = `(function(){var r=document.documentElement;r.lang="en-ZA";r.setAttribute("data-theme","light");r.removeAttribute("data-site");})();`;

export default function PartnersTradeInLayout({ children }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: PIN_LIGHT }} />
      {children}
    </>
  );
}
