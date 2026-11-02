(() => {
  const $ = (id) => document.getElementById(id);

  const state = { all: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

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
    try {
      result = await response.json();
    } catch {
      throw new Error("Invalid response received from server.");
    }

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

  const rowHTML = (p) => {
    const id = p._id || p.id;
    const hidden = p.visibility === "hidden";
    const features = p.bulletFeatures || [];

    const shown = features.slice(0, 3)
      .map((f) => `<span class="pk-feat">${escapeHTML(f)}</span>`)
      .join("");
    const extra = features.length > 3
      ? `<span class="pk-feat more">+${features.length - 3} more</span>`
      : "";

    return `
      <article class="pf-row pk-row ${hidden ? "is-hidden" : ""}" data-id="${escapeHTML(id)}"
               tabindex="0" role="link" aria-label="Open ${escapeHTML(p.packageName)}">
        <div class="pf-info">
          <div class="pk-top">
            <h3>${escapeHTML(p.packageName)}</h3>
            <span class="pk-price">${money(p.price)}</span>
          </div>
          <p class="pk-desc">${escapeHTML(p.description || "No description added.")}</p>
          <div class="pk-feats">${shown || '<span class="pd-muted">No features listed</span>'}${extra}</div>
        </div>

        <div class="pf-side">
          <span class="pf-badge ${hidden ? "hidden" : "visible"}">${hidden ? "Hidden" : "Visible"}</span>
          <label class="pf-switch">
            <span>Hide</span>
            <input type="checkbox" data-toggle="${escapeHTML(id)}" ${hidden ? "checked" : ""}>
            <i></i>
          </label>
          <button type="button" class="pf-del" data-delete="${escapeHTML(id)}">🗑 Delete</button>
        </div>
      </article>
    `;
  };

  const render = () => {
    $("pkLoading").hidden = true;
    $("pkError").hidden = true;

    $("pkList").innerHTML = state.all.map(rowHTML).join("");
    $("pkEmpty").hidden = state.all.length > 0;
    $("pkCount").textContent = `${state.all.length} package${state.all.length === 1 ? "" : "s"}`;
  };

  // -------------------- Load --------------------

  const load = async () => {
    try {
      const result = await apiRequest("/admin/actions/packages");
      const list = result.data?.packages || result.data || [];

      state.all = Array.isArray(list) ? list : [];
      render();
      showToast(result.message || "Packages fetched successfully");
    } catch (error) {
      $("pkLoading").hidden = true;
      $("pkError").hidden = false;
      $("pkError").textContent = error.message || "Unable to load packages.";
      showToast(error.message || "Unable to load packages.", true);
    }
  };

  // -------------------- Events --------------------

  const list = $("pkList");

  const openRow = (target) => {
    if (target.closest(".pf-switch, .pf-del")) return;
    const row = target.closest(".pf-row");
    if (row) window.location.href = `/admin/package/${encodeURIComponent(row.dataset.id)}`;
  };

  list.addEventListener("click", (event) => openRow(event.target));

  list.addEventListener("keydown", (event) => {
    if (event.key === "Enter") openRow(event.target);
  });

  // Hide toggle -> PATCH visibility
  list.addEventListener("change", async (event) => {
    const box = event.target.closest("input[data-toggle]");
    if (!box) return;

    const id = box.dataset.toggle;
    const pkg = state.all.find((p) => (p._id || p.id) === id);
    if (!pkg) return;

    const wantHidden = box.checked;
    box.disabled = true;

    try {
      const result = await apiRequest(
        `/admin/actions/package/visibility/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ visibility: wantHidden ? "hidden" : "visible" }),
        }
      );

      // Trust the backend's value if it sends one, otherwise use what we asked for.
      const confirmed = result.data?.visibility || (wantHidden ? "hidden" : "visible");
      pkg.visibility = confirmed;
      box.checked = confirmed === "hidden";

      const row = box.closest(".pf-row");
      row.classList.toggle("is-hidden", confirmed === "hidden");
      const badge = row.querySelector(".pf-badge");
      badge.className = `pf-badge ${confirmed}`;
      badge.textContent = confirmed === "hidden" ? "Hidden" : "Visible";

      showToast(result.message || "Visibility updated.");
    } catch (error) {
      box.checked = !wantHidden; // put the toggle back
      showToast(error.message || "Could not update visibility.", true);
    } finally {
      box.disabled = false;
    }
  });

    // -------------------- Delete --------------------

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

  const confirmDelete = (name) =>
    dialog({
      icon: "⚠️",
      title: "Are you sure to delete?",
      body: `"${name}" will be permanently deleted. This cannot be undone.`,
      onEsc: false,
      buttons: [
        { label: "Cancel", cls: "pf-btn-line", value: false, focus: true },
        { label: "Yes, delete", cls: "pf-btn-danger", value: true },
      ],
    });

  const errorPopup = (message) =>
    dialog({
      icon: "❌",
      title: "Deletion failed",
      body: message,
      onEsc: true,
      buttons: [{ label: "OKK", cls: "pf-btn-red", value: true, focus: true }],
    });

  list.addEventListener("click", async (event) => {
    const btn = event.target.closest(".pf-del");
    if (!btn) return;

    const id = btn.dataset.delete;
    const pkg = state.all.find((p) => (p._id || p.id) === id);
    if (!pkg) return;

    if (!(await confirmDelete(pkg.packageName))) return;

    btn.disabled = true;
    btn.textContent = "Deleting…";

    try {
      const result = await apiRequest(`/admin/actions/package/${encodeURIComponent(id)}`, { method: "DELETE" });
      state.all = state.all.filter((p) => (p._id || p.id) !== id);
      render();
      showToast(result.message || "Package deleted successfully.");
    } catch (error) {
      btn.disabled = false;
      btn.textContent = "🗑 Delete";
      await errorPopup(error.message || "Could not delete this package.");
    }
  });

  load();
})();