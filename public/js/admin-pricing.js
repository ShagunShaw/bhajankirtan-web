(() => {
  const $ = (id) => document.getElementById(id);
  const state = { basePrices: [], peakPrices: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

  // "YYYY-MM-DD" -> "21 Nov 2026" (no timezone shift)
  const formatDay = (s) => {
    const [y, m, d] = String(s || "").slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return "—";
    return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const todayStr = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };

  const periodStatus = (from, to) => {
    const t = todayStr();
    const f = String(from).slice(0, 10), e = String(to).slice(0, 10);
    if (t < f) return "upcoming";
    if (t > e) return "ended";
    return "active";
  };

  let toastTimer;
  const showToast = (message, isError = false) => {
    const t = $("pfToast");
    t.textContent = message;
    t.classList.toggle("error", isError);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  };

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      ...options,
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });

    let result;
    try { result = await response.json(); }
    catch { throw new Error("Invalid response received from server."); }

    if (response.status === 401 || response.status === 403) {
      window.location.href = "/admin/login";
      throw new Error("Your session has expired.");
    }
    if (!response.ok || result.success === false) {
      throw new Error(result.errMessage || "Something went wrong.");
    }
    return result;
  };

  // -------------------- Rendering --------------------

  const baseHTML = (b) => `
    <div class="pr-base" data-performer-id="${escapeHTML(b.performerId)}">
      <div class="pr-name">${escapeHTML(b.performer)}</div>
      <div class="pr-base-side">
        <span class="pr-amt">${money(b.basePrice)}</span>
        <button type="button" class="pr-btn pr-edit" data-edit-base="${escapeHTML(b.performerId)}">✎ Edit</button>
      </div>
    </div>`;

  const peakHTML = (p) => {
    const status = periodStatus(p.from, p.to);
    return `
      <div class="pr-peak" data-id="${escapeHTML(p._id)}">
        <div class="pr-peak-top">
          <div>
            <div class="pr-name">${escapeHTML(p.performer?.fullName || "Unknown performer")}</div>
            <div class="pr-label">${escapeHTML(p.label || "—")}</div>
          </div>
          <span class="pr-badge ${status}">${status}</span>
        </div>
        <div class="pr-dates">${formatDay(p.from)} → ${formatDay(p.to)}</div>
        <div class="pr-peak-bottom">
          <span class="pr-amt">${money(p.peakPrice)}</span>
          <div class="pr-actions">
            <button type="button" class="pr-btn pr-edit" data-edit-peak="${escapeHTML(p._id)}">✎ Edit</button>
            <button type="button" class="pr-btn pr-del" data-delete-peak="${escapeHTML(p._id)}">🗑 Delete</button>
          </div>
        </div>
      </div>`;
  };

  const render = () => {
    $("prLoading").hidden = true;
    $("prError").hidden = true;
    $("prGrid").hidden = false;

    const { basePrices, peakPrices } = state;

    $("baseCount").textContent = `${basePrices.length} performer${basePrices.length === 1 ? "" : "s"}`;
    $("peakCount").textContent = `${peakPrices.length} peak price${peakPrices.length === 1 ? "" : "s"}`;

    $("baseList").innerHTML = basePrices.length
      ? basePrices.map(baseHTML).join("")
      : '<div class="pr-empty">No performers found.</div>';

    $("peakList").innerHTML = peakPrices.length
      ? peakPrices.map(peakHTML).join("")
      : '<div class="pr-empty">No peak prices set.</div>';
  };

  // -------------------- Load --------------------

  const load = async () => {
    try {
      const result = await apiRequest("/admin/actions/prices");
      state.basePrices = result.data?.basePrices || [];
      state.peakPrices = result.data?.peakPrices || [];
      render();
      showToast(result.message || "Pricing details fetched successfully");
    } catch (error) {
      $("prLoading").hidden = true;
      $("prGrid").hidden = true;
      $("prError").hidden = false;
      $("prError").textContent = error.message || "Unable to load pricing.";
      showToast(error.message || "Unable to load pricing.", true);
    }
  };

  // Buttons ([data-edit-base], #addPeakBtn, [data-edit-peak], [data-delete-peak])
  // have no actions yet.

  load();
})();