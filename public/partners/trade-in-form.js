/*
 * Optional AJAX layer for the WP lander form.
 *
 * Loaded as <script src>, never inlined: Cloudflare WAF on epicdeals.co.za
 * rejects Custom HTML payloads that look like injected JavaScript
 * (see public/embed.js, Ray ID a33653eb5cbfef2a).
 */
(function () {
  var form = document.getElementById("ep-pilot-form");
  if (!form || form.getAttribute("data-ep-bound")) return;
  form.setAttribute("data-ep-bound", "1");

  form.addEventListener("submit", function (event) {
    if (typeof fetch !== "function" || form.getAttribute("data-ep-native") === "1") return;
    event.preventDefault();

    var button = form.querySelector('button[type="submit"]');
    if (button) {
      button.disabled = true;
      button.textContent = "Sending...";
    }

    fetch(form.action, {
      method: "POST",
      headers: { Accept: "application/json" },
      body: new FormData(form),
    })
      .then(function (res) {
        if (!res.ok) throw new Error("request failed");
        return res.json();
      })
      .then(function () {
        var card = form.parentNode;
        card.innerHTML =
          '<div class="ep-success" role="status"><h3>Thanks. We will reply within 2 business days.</h3><p>A short note to sell@epicdeals.co.za if your timeline is tighter.</p></div>';
      })
      .catch(function () {
        form.setAttribute("data-ep-native", "1");
        if (button) {
          button.disabled = false;
          button.textContent = "Request pilot access";
        }
        form.submit();
      });
  });
})();
