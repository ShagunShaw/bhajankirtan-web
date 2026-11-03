(() => {
  const TTL = 10 * 60 * 1000;
  const KEYS = { performers: "bk_performers_v1", packages: "bk_packages_v1" };
  const mem = {};
  const pending = {};

  const escapeHTML = (v = "") =>
    String(v).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const inr = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");
  const isUrl = (v) => /^https?:\/\//i.test(v || "");
  const cld = (url, t) =>
    /res\.cloudinary\.com/.test(url) && url.includes("/upload/") ? url.replace("/upload/", `/upload/${t}/`) : url;
  const tagName = (t) => String(typeof t === "string" ? t : t.displayName || t.name || "").replace(/_/g, " ");
  const initial = (name = "") => name.replace(/^(Pt\.|Acharya|Shri|Shree)\s+/i, "").trim().charAt(0).toUpperCase();

  const GRADS = [
    "linear-gradient(160deg,#f59e0b,#b45309)", "linear-gradient(160deg,#9b1c32,#52091a)",
    "linear-gradient(160deg,#e07b00,#7a1022)", "linear-gradient(160deg,#c2410c,#7c2d12)",
  ];

  const today = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
  const priceFor = (p) => {
    const t = today();
    const peak = (p.peakPeriods || []).find((x) => t >= String(x.from).slice(0, 10) && t <= String(x.to).slice(0, 10));
    return peak ? { amount: peak.price, label: peak.label || "" } : { amount: p.basePrice, label: "" };
  };

  // -------------------- Cache (10 min TTL) --------------------

  const read = (key) => {
    let o = mem[key];
    if (!o) { try { o = JSON.parse(localStorage.getItem(key)); } catch { o = null; } }
    return o && Date.now() - o.ts < TTL ? o.data : null;
  };
  const write = (key, data) => {
    const o = { ts: Date.now(), data };
    mem[key] = o;
    try { localStorage.setItem(key, JSON.stringify(o)); } catch { /* storage full/blocked: memory only */ }
  };

  const load = (key, url) => {
    const hit = read(key);
    if (hit) return Promise.resolve(hit);
    return (pending[key] ||= fetch(url, { cache: "reload", headers: { Accept: "application/json" } })
      .then(async (res) => {
        let json;
        try { json = await res.json(); } catch { throw new Error("Invalid response received from server."); }
        if (!res.ok || json.success === false) throw new Error(json.errMessage || "Something went wrong.");
        write(key, json.data);
        return json.data;
      })
      .finally(() => { delete pending[key]; }));
  };

  const getPerformers = () =>
    load(KEYS.performers, "/data/performers").then((d) => ({
      performers: d?.performers || [],
      tags: d?.tags || [],
    }));
  const getPackages = () =>
    load(KEYS.packages, "/data/packages").then((d) => (Array.isArray(d) ? d : d?.packages || []));

  // -------------------- Search helpers --------------------

  const norm = (s) => String(s).toLowerCase().replace(/[^\p{L}\p{M}\p{N}]+/gu, " ").trim();

  const lev = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return dp[a.length][b.length];
  };

  const score = (q, text) => {
    const n = norm(text);
    if (n === q) return 100;
    if (n.startsWith(q)) return 90;
    const words = n.split(" ");
    if (words.some((w) => w.startsWith(q))) return 80;
    if (n.includes(q)) return 70;
    const allowed = q.length >= 7 ? 2 : q.length >= 4 ? 1 : 0;
    if (!allowed) return 0;
    const best = Math.min(...words.map((w) => lev(q, w)), lev(q, n));
    return best <= allowed ? 50 - best * 10 : 0;
  };

  const suggest = (data, q) => {
    if (!data) return [];
    const out = [];
    data.performers.forEach((p) => {
      const s = score(q, p.fullName || "");
      if (s > 0) out.push({ label: p.fullName, type: "Artist", s });
    });
    data.tags.forEach((t) => {
      const s = score(q, t.name || "");
      if (s > 0) out.push({ label: tagName(t.name), type: "Tag", s: s - 1 });
    });
    return out.sort((a, b) => b.s - a.s || a.label.localeCompare(b.label)).slice(0, 8);
  };

  const filter = (list, q) => {
    const tokens = norm(q).split(" ").filter(Boolean);
    if (!tokens.length) return list;
    return list.filter((p) => {
      const hay = norm(`${p.fullName} ${(p.tags || []).join(" ")}`);
      return tokens.every((t) => hay.includes(t));
    });
  };

  // Suggestion dropdown. Picking only fills the input; the user then presses Search.
  const attachSuggest = (input, getData, onPick) => {
    const host = input.closest("form") || input.parentElement;
    const box = document.createElement("div");
    box.className = "sg";
    box.hidden = true;
    host.appendChild(box);

    let items = [], idx = -1;
    const hide = () => { box.hidden = true; idx = -1; items = []; };
    const paint = () => box.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === idx));
    const pick = (i) => { input.value = items[i].label; hide(); onPick?.(items[i]); };

    input.addEventListener("input", () => {
      const q = norm(input.value);
      if (!q) return hide();
      items = suggest(getData(), q);
      idx = -1;
      box.innerHTML = items
        .map((s, i) => `<button type="button" data-i="${i}"><span>${escapeHTML(s.label)}</span><em>${s.type}</em></button>`)
        .join("");
      box.hidden = !items.length;
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") return hide();
      if (!items.length) return;
      if (e.key === "ArrowDown") { e.preventDefault(); idx = (idx + 1) % items.length; paint(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); idx = idx <= 0 ? items.length - 1 : idx - 1; paint(); }
      else if (e.key === "Enter" && idx >= 0) { e.preventDefault(); pick(idx); }
    });

    box.addEventListener("mousedown", (e) => {
      const b = e.target.closest("button[data-i]");
      if (!b) return;
      e.preventDefault();
      pick(Number(b.dataset.i));
    });
    input.addEventListener("blur", hide);
  };

  // -------------------- Card templates --------------------

  const avatar = (p, i) =>
    isUrl(p.profilePhoto)
      ? `<img src="${escapeHTML(cld(p.profilePhoto, "w_400,h_460,c_fill,g_face,q_auto,f_auto"))}" alt="${escapeHTML(p.fullName)}" loading="lazy">`
      : escapeHTML(initial(p.fullName));

  const perfCard = (p, i) => {
    const pr = priceFor(p);
    return `
      <a href="/performers/${encodeURIComponent(p.id || p._id)}" class="perf">
        <div class="arch" style="background:${GRADS[i % GRADS.length]}">${avatar(p)}</div>
        <h3>${escapeHTML(p.fullName)}</h3>
        ${p.experience ? `<div class="exp">${escapeHTML(p.experience)} experience</div>` : ""}
        <div class="tags">${(p.tags || []).slice(0, 3).map((t) => `<span class="tag">${escapeHTML(tagName(t))}</span>`).join("")}</div>
        <div class="price">From <b>${inr(pr.amount)}</b>${pr.label ? `<span class="peak-label">${escapeHTML(pr.label)}</span>` : ""}</div>
        <span class="go">View &amp; Book</span>
      </a>`;
  };

  const perfRow = (p, i) => {
    const pr = priceFor(p);
    return `
      <a href="/performers/${encodeURIComponent(p.id || p._id)}" class="srow">
        <div class="sav" style="background:${GRADS[i % GRADS.length]}">${avatar(p)}</div>
        <div class="sinfo">
          <h3>${escapeHTML(p.fullName)}</h3>
          ${p.experience ? `<div class="exp">${escapeHTML(p.experience)} experience</div>` : ""}
          <div class="tags">${(p.tags || []).map((t) => `<span class="tag">${escapeHTML(tagName(t))}</span>`).join("")}</div>
        </div>
        <div class="sside">
          <div class="price">From <b>${inr(pr.amount)}</b></div>
          ${pr.label ? `<span class="peak-label">${escapeHTML(pr.label)}</span>` : ""}
          <span class="go">View &amp; Book</span>
        </div>
      </a>`;
  };

  const packCard = (pkg, i, opts = {}) => {
    const shots = (pkg.workPhotos || []).filter(isUrl).slice(0, 4);
    const mid = (shots.length - 1) / 2;
    const fan = shots.length
      ? `<div class="fan" aria-hidden="true">${shots.map((src, k) =>
          `<div class="fan-card" style="--a:${(k - mid) * 12}deg; --x:${(k - mid) * 38}px; z-index:${k + 1}"><img src="${escapeHTML(cld(src, "w_260,h_320,c_fill,q_auto,f_auto"))}" alt="" loading="lazy"></div>`).join("")}</div>`
      : "";
    const best = opts.stamp && i === 1;
    return `
      <a href="/packages/${encodeURIComponent(pkg._id)}" class="pack ${best ? "best" : ""}">
        ${best ? '<span class="stamp">MOST BOOKED</span>' : ""}
        ${fan}
        <h3>${escapeHTML(pkg.packageName)}</h3>
        <div class="amt">${inr(pkg.price)} <small>onwards</small></div>
        ${opts.full && pkg.description ? `<p class="pdesc">${escapeHTML(pkg.description)}</p>` : ""}
        <ul>${(pkg.bulletFeatures || []).map((f) => `<li>${escapeHTML(f)}</li>`).join("")}</ul>
        <span class="btn ${best ? "btn-gold" : "btn-red"}">Book This Package</span>
      </a>`;
  };

  window.Catalog = {
    getPerformers, getPackages, filter, attachSuggest,
    perfCard, perfRow, packCard, escapeHTML,
  };
})();