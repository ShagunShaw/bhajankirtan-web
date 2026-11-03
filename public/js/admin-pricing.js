(() => {
  const $ = (id) => document.getElementById(id);
  const state = { basePrices: [], peakPrices: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

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

  const load = async (silent = false) => {
    try {
      const result = await apiRequest("/admin/actions/prices");
      state.basePrices = result.data?.basePrices || [];
      state.peakPrices = result.data?.peakPrices || [];
      render();
      if (!silent) showToast(result.message || "Pricing details fetched successfully");
    } catch (error) {
      if (silent) return showToast(error.message || "Unable to refresh pricing.", true);
      $("prLoading").hidden = true;
      $("prGrid").hidden = true;
      $("prError").hidden = false;
      $("prError").textContent = error.message || "Unable to load pricing.";
      showToast(error.message || "Unable to load pricing.", true);
    }
  };

  // -------------------- Dialogs --------------------

  // Simple message dialog (confirm / error)
  const dialog = ({ icon, title, body, buttons, onEsc }) =>
    new Promise((resolve) => {
      const ov = document.createElement("div");
      ov.className = "pf-modal-ov";
      ov.innerHTML = `
        <div class="pf-modal" role="alertdialog" aria-modal="true" aria-labelledby="pfModalTitle">
          <div class="pf-modal-icon">${icon}</div>
          <h2 id="pfModalTitle">${escapeHTML(title)}</h2>
          <p>${escapeHTML(body)}</p>
          <div class="pf-modal-actions">
            ${buttons.map((b, i) => `<button type="button" class="pf-btn ${b.cls}" data-i="${i}">${escapeHTML(b.label)}</button>`).join("")}
          </div>
        </div>`;

      const close = (value) => {
        document.removeEventListener("keydown", onKey);
        ov.remove();
        resolve(value);
      };
      const onKey = (e) => { if (e.key === "Escape") close(onEsc); };

      ov.addEventListener("click", (e) => {
        const btn = e.target.closest("[data-i]");
        if (btn) close(buttons[Number(btn.dataset.i)].value);
      });
      document.addEventListener("keydown", onKey);
      document.body.appendChild(ov);
      ov.querySelector(`[data-i="${buttons.findIndex((b) => b.focus)}"]`)?.focus();
    });

  // Form dialog. onSubmit(get) may throw Error(message); the message shows inside the popup.
  const formModal = ({ icon, title, bodyHTML, submitLabel, onOpen, onSubmit }) => {
    const ov = document.createElement("div");
    ov.className = "pf-modal-ov pr-modal-ov";
    ov.innerHTML = `
      <form class="pf-modal pr-modal" role="dialog" aria-modal="true" novalidate autocomplete="off">
        <div class="pf-modal-icon">${icon}</div>
        <h2>${escapeHTML(title)}</h2>
        <div class="pr-modal-body">${bodyHTML}</div>
        <div class="pr-modal-err" hidden></div>
        <div class="pf-modal-actions">
          <button type="button" class="pf-btn pf-btn-line" data-cancel>Cancel</button>
          <button type="submit" class="pf-btn pf-btn-red">${escapeHTML(submitLabel)}</button>
        </div>
      </form>`;

    const form = ov.querySelector("form");
    const errBox = ov.querySelector(".pr-modal-err");
    const submitBtn = form.querySelector('[type="submit"]');
    const get = (name) => form.querySelector(`[name="${name}"]`)?.value ?? "";

    const close = () => { document.removeEventListener("keydown", onKey); ov.remove(); };
    const onKey = (e) => { if (e.key === "Escape") close(); };

    form.querySelector("[data-cancel]").addEventListener("click", close);
    document.addEventListener("keydown", onKey);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errBox.hidden = true;
      submitBtn.disabled = true;
      submitBtn.textContent = "Saving…";
      try {
        await onSubmit(get);
        close();
      } catch (error) {
        errBox.textContent = error.message || "Something went wrong.";
        errBox.hidden = false;
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      }
    });

    document.body.appendChild(ov);
    onOpen?.(form);
    form.querySelector("input:not([type=hidden])")?.focus();
  };

  // -------------------- Edit base price --------------------

  const openBaseEdit = (performerId) => {
    const b = state.basePrices.find((x) => x.performerId === performerId);
    if (!b) return;

    formModal({
      icon: "✎",
      title: "Edit base price",
      submitLabel: "Update",
      bodyHTML: `
        <div class="pf-field"><label>Performer</label><div class="pr-static">${escapeHTML(b.performer)}</div></div>
        <div class="pf-field">
          <label for="mBase">Base price (₹)</label>
          <input id="mBase" name="basePrice" type="number" min="1" step="1" inputmode="numeric" value="${escapeHTML(b.basePrice ?? "")}">
        </div>`,
      onSubmit: async (get) => {
        const raw = get("basePrice");
        const price = Number(raw);
        if (raw === "" || !Number.isFinite(price) || price < 1) throw new Error("Enter a valid base price of at least 1.");

        const result = await apiRequest(`/admin/actions/price/basePrice/${encodeURIComponent(performerId)}`, {
          method: "PATCH",
          body: JSON.stringify({ basePrice: price }),
        });
        await load(true);
        showToast(result.message || "Base price updated successfully.");
      },
    });
  };

  // -------------------- Add / edit peak price --------------------

  const peakFields = (p) => `
    <div class="pf-field">
      <label for="mLabel">Label</label>
      <input id="mLabel" name="label" type="text" maxlength="60" placeholder="e.g. Navratri Season" value="${escapeHTML(p?.label || "")}">
    </div>
    <div class="pr-row2">
      <div class="pf-field">
        <label for="mFrom">From</label>
        <input id="mFrom" name="from" type="date" value="${escapeHTML(String(p?.from || "").slice(0, 10))}">
      </div>
      <div class="pf-field">
        <label for="mTo">To</label>
        <input id="mTo" name="to" type="date" value="${escapeHTML(String(p?.to || "").slice(0, 10))}">
      </div>
    </div>
    <div class="pf-field">
      <label for="mPeak">Peak price (₹)</label>
      <input id="mPeak" name="peakPrice" type="number" min="1" step="1" inputmode="numeric" placeholder="e.g. 12000" value="${escapeHTML(p?.peakPrice ?? "")}">
    </div>`;

  const checkDates = (from, to) => {
    if (!from || !to) throw new Error("Both From and To dates are required.");
    if (to < from) throw new Error("End date must be on or after the start date.");
  };
  const checkPrice = (raw) => {
    const n = Number(raw);
    if (raw === "" || !Number.isFinite(n) || n < 1) throw new Error("Enter a valid peak price of at least 1.");
    return n;
  };

  const openPeakEdit = (id) => {
    const p = state.peakPrices.find((x) => x._id === id);
    if (!p) return;

    formModal({
      icon: "✎",
      title: "Edit peak price",
      submitLabel: "Update",
      bodyHTML: `
        <div class="pf-field"><label>Performer</label><div class="pr-static">${escapeHTML(p.performer?.fullName || "Unknown performer")}</div></div>
        ${peakFields(p)}`,
      onSubmit: async (get) => {
        const label = get("label").trim();
        const from = get("from");
        const to = get("to");
        const price = checkPrice(get("peakPrice"));

        if (!label) throw new Error("Label cannot be empty.");
        checkDates(from, to);

        // Send only what changed
        const body = {};
        if (label !== (p.label || "")) body.label = label;
        if (from !== String(p.from).slice(0, 10)) body.from = from;
        if (to !== String(p.to).slice(0, 10)) body.to = to;
        if (price !== Number(p.peakPrice)) body.peakPrice = price;
        if (!Object.keys(body).length) throw new Error("No changes to save.");

        const result = await apiRequest(`/admin/actions/price/peakPrice/${encodeURIComponent(id)}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        });
        await load(true);
        showToast(result.message || "Peak price updated successfully.");
      },
    });
  };

  const openPeakAdd = () => {
    const performers = [...state.basePrices].sort((a, b) => a.performer.localeCompare(b.performer));
    let selectedId = null;

    formModal({
      icon: "🪔",
      title: "Add peak price",
      submitLabel: "Add",
      bodyHTML: `
        <div class="pf-field">
          <label for="mPerf">Performer</label>
          <div class="pr-combo">
            <input id="mPerf" type="text" placeholder="Search performer…" autocomplete="off" role="combobox" aria-expanded="false">
            <div class="pr-combo-list" hidden></div>
          </div>
        </div>
        ${peakFields()}`,
      onOpen: (form) => {
        const input = form.querySelector("#mPerf");
        const listEl = form.querySelector(".pr-combo-list");

        const matches = () => {
          const q = input.value.trim().toLowerCase();
          return performers.filter((p) => p.performer.toLowerCase().includes(q));
        };

        const showList = () => {
          const m = matches();
          listEl.innerHTML = m.length
            ? m.map((p, i) => `<button type="button" class="${i === 0 ? "active" : ""}" data-id="${escapeHTML(p.performerId)}">${escapeHTML(p.performer)}</button>`).join("")
            : '<div class="pr-combo-empty">No performer found</div>';
          listEl.hidden = false;
          input.setAttribute("aria-expanded", "true");
        };
        const hideList = () => { listEl.hidden = true; input.setAttribute("aria-expanded", "false"); };
        const pick = (id) => {
          const p = performers.find((x) => x.performerId === id);
          if (!p) return;
          selectedId = id;
          input.value = p.performer;
          hideList();
        };

        input.addEventListener("input", () => { selectedId = null; showList(); });
        input.addEventListener("click", showList);
        input.addEventListener("keydown", (e) => {
          if (e.key === "Enter" && !listEl.hidden) {
            e.preventDefault();
            const first = listEl.querySelector("button");
            if (first) pick(first.dataset.id);
          }
        });
        listEl.addEventListener("mousedown", (e) => {
          const btn = e.target.closest("button[data-id]");
          if (btn) { e.preventDefault(); pick(btn.dataset.id); }
        });
        form.addEventListener("click", (e) => { if (!e.target.closest(".pr-combo")) hideList(); });
        requestAnimationFrame(() => form.querySelector("#mLabel")?.focus());
      },
      onSubmit: async (get) => {
        // Accept an exact typed name if the admin didn't click the list item
        if (!selectedId) {
          const typed = get("performer") || document.getElementById("mPerf").value.trim().toLowerCase();
          const exact = performers.filter((p) => p.performer.toLowerCase() === String(typed).toLowerCase());
          if (exact.length === 1) selectedId = exact[0].performerId;
        }
        if (!selectedId) throw new Error("Select a performer from the list.");

        const label = get("label").trim();
        const from = get("from");
        const to = get("to");
        const price = checkPrice(get("peakPrice"));

        if (!label) throw new Error("Label is required.");
        checkDates(from, to);

        const result = await apiRequest("/admin/actions/price/peakPrice", {
          method: "POST",
          body: JSON.stringify({ performerId: selectedId, label, from, to, peakPrice: price }),
        });
        await load(true);
        showToast(result.message || "Peak price created successfully.");
      },
    });
  };

  // -------------------- Delete peak price --------------------

  const deletePeak = async (id) => {
    const p = state.peakPrices.find((x) => x._id === id);
    if (!p) return;

    const ok = await dialog({
      icon: "⚠️",
      title: "Are you sure to delete?",
      body: `The peak price "${p.label || "—"}" for ${p.performer?.fullName || "this performer"} will be permanently deleted.`,
      onEsc: false,
      buttons: [
        { label: "Cancel", cls: "pf-btn-line", value: false, focus: true },
        { label: "Yes, delete", cls: "pf-btn-danger", value: true },
      ],
    });
    if (!ok) return;

    try {
      const result = await apiRequest(`/admin/actions/price/peakPrice/${encodeURIComponent(id)}`, { method: "DELETE" });
      await load(true);
      showToast(result.message || "Peak price deleted successfully.");
    } catch (error) {
      await dialog({
        icon: "❌",
        title: "Deletion failed",
        body: error.message || "Could not delete this peak price.",
        onEsc: true,
        buttons: [{ label: "OKK", cls: "pf-btn-red", value: true, focus: true }],
      });
    }
  };

  // -------------------- Events --------------------

  $("baseList").addEventListener("click", (e) => {
    const btn = e.target.closest("[data-edit-base]");
    if (btn) openBaseEdit(btn.dataset.editBase);
  });

  $("peakList").addEventListener("click", (e) => {
    const edit = e.target.closest("[data-edit-peak]");
    if (edit) return openPeakEdit(edit.dataset.editPeak);
    const del = e.target.closest("[data-delete-peak]");
    if (del) deletePeak(del.dataset.deletePeak);
  });

  $("addPeakBtn").addEventListener("click", openPeakAdd);

  load();
})();