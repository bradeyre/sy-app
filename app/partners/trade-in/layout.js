import "./partners.css";

/**
 * Preview-only shell for /partners/trade-in.
 *
 * Production is WordPress at epicdeals.co.za/partners/trade-in-as-payment/.
 * Tokens are scoped to `.ep` so a dark OS or an epicdeals host (which
 * otherwise sets data-site and #1e73be) cannot restyle this lander or
 * leak into the calculator embed on `/`.
 *
 * Do not mutate <html> here. An inline script that sets lang / data-theme
 * races React hydration on the root layout and paints the Next overlay.
 */
export default function PartnersTradeInLayout({ children }) {
  return children;
}
