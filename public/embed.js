/*
 * Drop-in embed for the shared calculator.
 *
 * Exists because the page content could not carry the script itself.
 * epicdeals.co.za sits behind Cloudflare, whose managed WAF rules reject any
 * request whose body looks like injected JavaScript -- so saving a Custom HTML
 * block containing an inline <script> returned a Cloudflare block page, and
 * WordPress surfaced that as "Updating failed. The response is not a valid
 * JSON response." (Ray ID a33653eb5cbfef2a, 2026-08-30.)
 *
 * A <script src> tag carries no code in the payload, so it saves. It is also
 * simply better: the embed logic lives with the calculator, and changing it is
 * a deploy here rather than an edit in WordPress on a site where editing is
 * evidently fragile.
 *
 * Usage, anywhere:
 *   <div data-sym-calculator data-site="epicdeals" data-theme="light"></div>
 *   <script src="https://sym-calculator.vercel.app/embed.js" defer></script>
 *
 * data-site  the tenant key (required to get anything but the default site)
 * data-theme "light" or "dark" to pin it; omit to follow the visitor's OS
 * data-nav   pixels to leave clear above the frame when correcting scroll
 */
(function () {
  var ORIGIN = "https://sym-calculator.vercel.app";
  // Below this, a height change is the calculator reflowing in place rather
  // than advancing a step, and is not worth moving the page for.
  var STEP_CHANGE = 120;

  var mounts = document.querySelectorAll("[data-sym-calculator], #ed-calculator");
  if (!mounts.length) return;

  var reduceMotion =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  Array.prototype.forEach.call(mounts, function (mount) {
    if (mount.getAttribute("data-sym-mounted")) return;
    mount.setAttribute("data-sym-mounted", "1");

    var site = mount.getAttribute("data-site") || "";
    var theme = mount.getAttribute("data-theme") || "";
    var navOffset = parseInt(mount.getAttribute("data-nav"), 10);
    if (isNaN(navOffset)) navOffset = 24;

    var qs = [];
    if (site) qs.push("site=" + encodeURIComponent(site));
    if (theme === "light" || theme === "dark") qs.push("theme=" + theme);

    var frame = document.createElement("iframe");
    frame.src = ORIGIN + "/" + (qs.length ? "?" + qs.join("&") : "");
    frame.title = "Get an instant offer";
    frame.setAttribute("scrolling", "no");
    frame.style.cssText = "width:100%;border:0;display:block;height:720px;";
    if (!reduceMotion) frame.style.transition = "height .3s cubic-bezier(.16,1,.3,1)";
    mount.style.minHeight = "";
    mount.appendChild(frame);

    var previous = 720;

    window.addEventListener("message", function (e) {
      if (e.origin !== ORIGIN) return;
      if (e.source !== frame.contentWindow) return;
      var data = e.data;
      if (!data || data.type !== "epic-calc-resize") return;
      var next = data.height;
      if (typeof next !== "number" || next <= 0) return;

      var delta = Math.abs(next - previous);
      previous = next;
      frame.style.height = next + "px";
      if (delta < STEP_CHANGE) return;

      // Measured a frame later, so the document has already taken its new
      // length. Scrolling before that means the browser clamps scrollY on a
      // collapse and silently undoes it.
      requestAnimationFrame(function () {
        var top = frame.getBoundingClientRect().top;
        if (top >= navOffset) return;
        // Smooth reads as considerate over a short distance and as the page
        // running away over a long one.
        var far = navOffset - top > window.innerHeight;
        window.scrollTo({
          top: window.scrollY + top - navOffset,
          behavior: reduceMotion || far ? "auto" : "smooth"
        });
      });
    });
  });
})();
