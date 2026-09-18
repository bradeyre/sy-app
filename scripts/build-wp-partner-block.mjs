/**
 * Assembles the GenerateBlocks-ready HTML from partners.css so the WP
 * paste and the Next preview share one stylesheet.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const css = readFileSync(join(root, "app/partners/trade-in/partners.css"), "utf8");
const outDir = join(root, "public/partners");
mkdirSync(outDir, { recursive: true });
copyFileSync(join(root, "app/partners/trade-in/partners.css"), join(outDir, "trade-in.css"));

const html = `<!DOCTYPE html>
<!--
  Epic Partners trade-in lander for GenerateBlocks → Custom HTML.
  No <script> tags on purpose: Cloudflare WAF on epicdeals.co.za rejects
  inline JS in WP update payloads (see public/embed.js). JSON-LD belongs
  in Yoast. Optional form UX: <script src="https://sym-calculator.vercel.app/partners/trade-in-form.js" defer></script>
-->
<style>
${css}
.ep { font-family: Satoshi, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
</style>
<div class="ep">
  <a class="ep-skip" href="#apply">Skip to apply</a>
  <header class="ep-wrap ep-top">
    <p class="ep-mark">Epic <span>Deals</span></p>
    <a class="ep-top-link" href="https://epicdeals.co.za/sell/">Sell your tech</a>
  </header>
  <main>
    <div class="ep-preform">
      <section class="ep-hero">
        <div class="ep-wrap ep-hero-grid">
          <div>
            <h1 class="ep-h1">Pay with the stuff they already own.</h1>
            <p class="ep-lede">A payment method, not a phone-upgrade side quest. They put the Dyson, the GoPro, the old PlayStation on the bill. You sell the couch.</p>
            <p class="ep-proof">
              <span>Trading since 2014</span>
              <span>R90m+ paid to South Africans for old tech</span>
              <span>2,500+ reviews</span>
            </p>
            <div class="ep-hero-actions">
              <a class="ep-btn" href="#apply">Apply for a pilot partnership</a>
              <a class="ep-text-link" href="#embed">See how the calculator embeds</a>
            </div>
          </div>
          <div class="ep-art" aria-hidden="true">
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="16" y="6" width="16" height="36" rx="3.5"/><path d="M22 10h4M22 38h4"/></svg>
            </figure>
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="8" y="10" width="32" height="20" rx="2"/><path d="M6 34h36l-2 4H8z"/></svg>
            </figure>
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M10 18h8M14 14v8"/><circle cx="32" cy="18" r="1.4" fill="currentColor" stroke="none"/><circle cx="28" cy="22" r="1.4" fill="currentColor" stroke="none"/><path d="M9 20c-4 0-6 4-5.5 8S7 36 11 36c2.4 0 3.2-2 5-3.4 1.4-1 3-1.6 4.6-1.6h7c1.6 0 3.2.6 4.6 1.6 1.8 1.4 2.6 3.4 5 3.4 4 0 6.8-4 7.3-8S43 20 39 20z"/></svg>
            </figure>
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="17" y="12" width="14" height="18" rx="4"/><path d="M21 8h6M21 34h6M24 18v5h4"/></svg>
            </figure>
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M20 8h8l6 18H14z"/><rect x="10" y="26" width="28" height="10" rx="3"/></svg>
            </figure>
            <figure>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><rect x="8" y="16" width="32" height="20" rx="3"/><circle cx="24" cy="26" r="6"/><path d="M16 16l2-5h12l2 5"/></svg>
            </figure>
          </div>
        </div>
      </section>
      <a class="ep-btn ep-sticky" href="#apply">Apply for a pilot partnership</a>
      <section class="ep-band ep-band--canvas">
        <div class="ep-wrap">
          <h2 class="ep-h2">The awkward truth</h2>
          <p class="ep-copy">Most carts die because the money is sitting in a cupboard. Last year's phone. The coffee machine. The watch they upgraded from. Trade-in as payment unlocks that liquidity at checkout, not after a sell-then-buy dance.</p>
        </div>
      </section>
      <section class="ep-section">
        <div class="ep-wrap">
          <div class="ep-section-head">
            <h2 class="ep-h2">How the payment method works</h2>
            <p class="ep-copy">They pay with stuff they already own. We liquidate it. You are not in the second-hand business.</p>
          </div>
          <div class="ep-steps">
            <article class="ep-card"><span class="ep-step-n">01</span><h3>They pick your product</h3><p>A couch, a fridge, a jacket. The thing they came to buy from you.</p></article>
            <article class="ep-card"><span class="ep-step-n">02</span><h3>Instant quote on their stuff</h3><p>Phones, MacBooks, consoles, GoPro, Dyson, GHD, coffee machines, luxury watches. Inside your flow, not a detour.</p></article>
            <article class="ep-card"><span class="ep-step-n">03</span><h3>Epic funds the cash base</h3><p>The Good buyback comes off our P&amp;L. You are not running a second-hand desk.</p></article>
            <article class="ep-card"><span class="ep-step-n">04</span><h3>You can top up</h3><p>Optional subsidy from your SKU margin. You set it. You can turn it off.</p></article>
            <article class="ep-card"><span class="ep-step-n">05</span><h3>The kit ships to Epic</h3><p>We take intake, fraud and liquidation. You keep the sale.</p></article>
          </div>
        </div>
      </section>
      <section class="ep-section" style="padding-top:0">
        <div class="ep-wrap">
          <div class="ep-section-head"><h2 class="ep-h2">What you never have to become</h2></div>
          <ul class="ep-never">
            <li>No grading lab.</li>
            <li>No buyback P&amp;L.</li>
            <li>No fraud desk.</li>
            <li>No “what is this cracked iPhone or half-dead Dyson worth” spreadsheet.</li>
          </ul>
        </div>
      </section>
      <section class="ep-band ep-band--canvas">
        <div class="ep-wrap">
          <div class="ep-section-head"><h2 class="ep-h2">Who this is for</h2></div>
          <div class="ep-split">
            <article class="ep-card"><h3>Retail with a real ticket</h3><p>Furniture, appliances, fashion, specialty retail, e-comm. AOV high enough that a used phone, a laptop, or a Dyson meaningfully closes the gap.</p></article>
            <article class="ep-card ep-who--not"><h3>Not phone-upgrade financing</h3><p>That is a different game. We do not pretend to be Breezy, and we will not claim to beat them on new-phone trade-in credit.</p></article>
          </div>
        </div>
      </section>
      <section class="ep-section">
        <div class="ep-wrap">
          <div class="ep-section-head"><h2 class="ep-h2">The economics, plain</h2></div>
          <div class="ep-econ">
            <article class="ep-card"><h3>Epic pays the Good cash base</h3><p>That is our buyback, from our book. Not a loan against a new phone.</p></article>
            <article class="ep-card"><h3>You may add a top-up</h3><p>From your product margin, if you want the deal to close harder. Optional.</p></article>
            <article class="ep-card"><h3>A clear fee to Epic</h3><p>We run intake and liquidate the device. You see the number before you pilot.</p></article>
            <article class="ep-card"><h3>One line at checkout</h3><p>The customer sees a payment method, not a black box of trade-in maths.</p></article>
          </div>
        </div>
      </section>
      <section class="ep-section" id="embed" style="padding-top:0">
        <div class="ep-wrap">
          <div class="ep-section-head">
            <h2 class="ep-h2">Your colours. Our engine.</h2>
            <p class="ep-copy">The live calculator already embeds on partner-style pages. A partner key keeps the quote engine ours and the chrome yours. Phones, yes. Also the cupboard.</p>
          </div>
          <div class="ep-embed" aria-hidden="true">
            <div class="ep-embed-bar"><i class="ep-embed-dot"></i><i class="ep-embed-dot"></i><i class="ep-embed-dot"></i> yourstore.co.za/checkout</div>
            <div class="ep-embed-body">
              <div class="ep-chip-row"><span class="ep-chip">Phone</span><span class="ep-chip">MacBook</span><span class="ep-chip">Console</span><span class="ep-chip">GoPro</span><span class="ep-chip">Dyson</span><span class="ep-chip">GHD</span><span class="ep-chip">Watch</span><span class="ep-chip">Coffee</span></div>
              <div class="ep-embed-cta">Get an instant offer</div>
            </div>
          </div>
        </div>
      </section>
    </div>
    <section class="ep-band ep-band--deep">
      <div class="ep-wrap">
        <h2 class="ep-h2">Trading since 2014</h2>
        <p class="ep-copy">Sell Your niche network plus Epic Deals retail. R90m+ paid out. We do not promise the highest cash prices in SA. Honesty converts partners.</p>
        <div class="ep-stats">
          <p><strong>2014</strong><span>Trading since</span></p>
          <p><strong>R90m+</strong><span>Paid to South Africans for old tech</span></p>
          <p><strong>2,500+</strong><span>Reviews</span></p>
        </div>
      </div>
    </section>
    <section class="ep-section" id="apply">
      <div class="ep-wrap" style="max-width:40rem">
        <div class="ep-section-head">
          <h2 class="ep-h2">Apply for a pilot</h2>
          <p class="ep-copy">Looking for a handful of retailers. Manual first, then the embed. Or write <a href="mailto:sell@epicdeals.co.za">sell@epicdeals.co.za</a>.</p>
        </div>
        <div class="ep-card">
          <form class="ep-form" id="ep-pilot-form" action="https://sym-calculator.vercel.app/api/partners/trade-in" method="post" accept-charset="UTF-8" aria-label="Pilot partnership application">
            <div class="ep-hp" aria-hidden="true">
              <label>Company fax <input type="text" name="honeypot" tabindex="-1" autocomplete="off"></label>
            </div>
            <div class="ep-fields ep-fields--2">
              <label class="ep-field"><span>Name</span><input name="name" autocomplete="name" required></label>
              <label class="ep-field"><span>Company</span><input name="company" autocomplete="organization" required></label>
              <label class="ep-field"><span>Website</span><input name="website" inputmode="url" autocomplete="url" placeholder="https://" required></label>
              <label class="ep-field"><span>Role</span>
                <select name="role" autocomplete="organization-title" required>
                  <option value="">Select</option>
                  <option>Founder / owner</option>
                  <option>Marketing</option>
                  <option>E-commerce</option>
                  <option>Operations</option>
                  <option>Other</option>
                </select>
              </label>
              <label class="ep-field"><span>Email</span><input name="email" type="email" inputmode="email" autocomplete="email" required></label>
              <label class="ep-field"><span>Phone (SA)</span><input name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="082 123 4567" required></label>
              <label class="ep-field"><span>Monthly orders (approx)</span>
                <select name="monthlyOrders" required>
                  <option value="">Select</option>
                  <option>Under 50</option>
                  <option>50-200</option>
                  <option>200-1 000</option>
                  <option>1 000+</option>
                </select>
              </label>
            </div>
            <fieldset class="ep-checks">
              <legend>Categories you sell</legend>
              <div class="ep-check-grid">
                <label class="ep-check"><input type="checkbox" name="categories" value="Furniture"> Furniture</label>
                <label class="ep-check"><input type="checkbox" name="categories" value="Appliances"> Appliances</label>
                <label class="ep-check"><input type="checkbox" name="categories" value="Fashion"> Fashion</label>
                <label class="ep-check"><input type="checkbox" name="categories" value="Specialty retail"> Specialty retail</label>
                <label class="ep-check"><input type="checkbox" name="categories" value="E-commerce"> E-commerce</label>
                <label class="ep-check"><input type="checkbox" name="categories" value="Other"> Other</label>
              </div>
            </fieldset>
            <label class="ep-field"><span>Message (optional)</span><textarea name="message" rows="4"></textarea></label>
            <button class="ep-btn" type="submit">Request pilot access</button>
          </form>
        </div>
      </div>
    </section>
    <section class="ep-section" style="padding-top:0">
      <div class="ep-wrap">
        <div class="ep-section-head"><h2 class="ep-h2">Questions partners actually ask</h2></div>
        <div class="ep-faq">
          <details><summary>Is this the same as Apple or Breezy trade-in?</summary><p>No. Those subsidise new-phone upgrades. We turn the stuff they already own into a payment toward your product. Phones, yes. Also GoPro, Dyson, GHD, coffee machines, watches, consoles.</p></details>
          <details><summary>Who holds the inventory risk?</summary><p>Epic, once the device passes intake.</p></details>
          <details><summary>Can we white-label the calculator?</summary><p>Yes. Embed with a partner key; your colours, our engine.</p></details>
          <details><summary>How fast to pilot?</summary><p>Weeks, not quarters. Manual first, then embed.</p></details>
          <details><summary>South Africa only?</summary><p>Built for South Africa first: courier, banking, local categories.</p></details>
        </div>
      </div>
    </section>
  </main>
  <footer class="ep-wrap ep-foot">
    <p>Epic Deals</p>
    <div class="ep-foot-row">
      <a href="https://epicdeals.co.za/">epicdeals.co.za</a>
      <a href="mailto:sell@epicdeals.co.za">sell@epicdeals.co.za</a>
      <a href="tel:+27109001258">010 900 1258</a>
      <a href="https://epicdeals.co.za/sell/">Consumer sell flow</a>
    </div>
  </footer>
</div>
`;

const dest = join(outDir, "trade-in-wp-block.html");
writeFileSync(dest, html);
console.log(`wrote ${dest} (${html.length} bytes)`);
