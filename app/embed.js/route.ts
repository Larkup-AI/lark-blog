import { getBaseUrl, brand } from "@/lib/config";

/**
 * No-code embed. Drop this on any site (Wix, Webflow, Framer, WordPress…):
 *
 *   <div id="lark-blog"></div>
 *   <script src="https://studio.example.com/embed.js"
 *           data-key="pk_live_..."            // publishable key only
 *           data-target="#lark-blog"></script>
 *
 * It renders the workspace's published posts client-side. Weaker for SEO than
 * the hosted blog — documented tradeoff. Only publishable (pk_) keys should be
 * used here; they can never read drafts or write.
 */

export const dynamic = "force-dynamic";

export function GET() {
  const studio = getBaseUrl();
  const badge = `Powered by ${brand.name}`;

  const js = `(function () {
  var current = document.currentScript;
  if (!current) return;
  var key = current.getAttribute("data-key");
  var studio = (current.getAttribute("data-studio") || ${JSON.stringify(studio)}).replace(/\\/$/, "");
  var targetSel = current.getAttribute("data-target") || "#lark-blog";
  var limit = current.getAttribute("data-limit") || "10";
  var showBadge = current.getAttribute("data-badge") !== "false";
  if (!key) { console.error("[lark-embed] missing data-key"); return; }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html != null) n.innerHTML = html;
    return n;
  }
  function esc(s) { var d = document.createElement("div"); d.textContent = s == null ? "" : String(s); return d.innerHTML; }

  function render(target, posts) {
    target.innerHTML = "";
    var list = el("div", "lark-embed-list");
    list.style.display = "grid";
    list.style.gap = "16px";
    posts.forEach(function (p) {
      var card = el("a", "lark-embed-post");
      card.href = studio + "/blog/" + encodeURIComponent(p.slug);
      card.target = "_blank";
      card.rel = "noopener";
      card.style.cssText = "display:block;text-decoration:none;color:inherit;border:1px solid #e5e7eb;border-radius:12px;padding:16px;";
      var inner = "";
      if (p.coverImage) inner += '<img src="' + esc(p.coverImage) + '" alt="" style="width:100%;height:160px;object-fit:cover;border-radius:8px;margin-bottom:12px;">';
      inner += '<h3 style="margin:0 0 6px;font-size:18px;font-weight:600;">' + esc(p.title) + "</h3>";
      if (p.category) inner += '<span style="font-size:12px;color:#6b7280;">' + esc(p.category) + "</span>";
      card.innerHTML = inner;
      list.appendChild(card);
    });
    target.appendChild(list);
    if (showBadge) {
      var b = el("div", "lark-embed-badge", '<a href="' + studio + '" target="_blank" rel="noopener" style="color:#9ca3af;text-decoration:none;">' + ${JSON.stringify(badge)} + "</a>");
      b.style.cssText = "margin-top:16px;font-size:12px;text-align:center;";
      target.appendChild(b);
    }
  }

  function mount() {
    var target = document.querySelector(targetSel);
    if (!target) { console.error("[lark-embed] target not found:", targetSel); return; }
    target.innerHTML = '<p style="color:#9ca3af;font-size:14px;">Loading…</p>';
    fetch(studio + "/api/v1/blogs?limit=" + encodeURIComponent(limit), {
      headers: { Authorization: "Bearer " + key }
    })
      .then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); })
      .then(function (data) { render(target, (data && data.posts) || []); })
      .catch(function (e) {
        target.innerHTML = '<p style="color:#ef4444;font-size:14px;">Could not load posts.</p>';
        console.error("[lark-embed]", e);
      });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();`;

  return new Response(js, {
    headers: {
      "Content-Type": "text/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
