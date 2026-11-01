(() => {
  const $ = (id) => document.getElementById(id);

  const state = { all: [], filtered: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

  const formatDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  };

  const isUrl = (v) => /^https?:\/\//i.test(v || "");

  // Ask Cloudinary for a small, optimised version of the photo.
  const cld = (url, transform) =>
    /res\.cloudinary\.com/.test(url) && url.includes("/upload/")
      ? url.replace("/upload/", `/upload/${transform}/`)
      : url;

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

  const avatarHTML = (p) => {
    const initial = escapeHTML((p.fullName || "?").trim().charAt(0).toUpperCase());
    return isUrl(p.profilePhoto)
      ? `<div class="pf-avatar"><img src="${escapeHTML(cld(p.profilePhoto, "w_160,h_160,c_fill,g_face,q_auto,f_auto"))}"
            alt="${escapeHTML(p.fullName)}" loading="lazy" data-initial="${initial}"></div>`
      : `<div class="pf-avatar">${initial}</div>`;
  };

  const rowHTML = (p) => {
    const hidden = p.visibility === "hidden";
    const tags = (p.tags || []).map((t) => `<span class="pf-tag">${escapeHTML(t)}</span>`).join("");

    return `
      <article class="pf-row ${hidden ? "is-hidden" : ""}" data-id="${escapeHTML(p.id)}"
               tabindex="0" role="link" aria-label="Open ${escapeHTML(p.fullName)}">
        ${avatarHTML(p)}

        <div class="pf-info">
          <h3>${escapeHTML(p.fullName)}</h3>
          <div class="pf-meta">
            ${escapeHTML(p.experience || "—")} experience · From <b>${money(p.basePrice)}</b>
          </div>
          <div class="pf-tags">${tags || '<span class="pd-muted">No tags</span>'}</div>
        </div>

        <div class="pf-side">
          <span class="pf-badge ${hidden ? "hidden" : "visible"}">${hidden ? "Hidden" : "Visible"}</span>
          <label class="pf-switch">
            <span>Hide</span>
            <input type="checkbox" data-toggle="${escapeHTML(p.id)}" ${hidden ? "checked" : ""}>
            <i></i>
          </label>
          <span class="pf-added">Added ${formatDate(p.createdAt)}</span>
        </div>
      </article>
    `;
  };

  const render = () => {
    $("pfLoading").hidden = true;
    $("pfError").hidden = true;

    $("pfList").innerHTML = state.filtered.map(rowHTML).join("");
    $("pfEmpty").hidden = state.filtered.length > 0;
    $("pfCount").textContent = `Showing ${state.filtered.length} of ${state.all.length}`;
  };

  // -------------------- Filtering (frontend only) --------------------

  const fillDatalists = () => {
    const names = [...new Set(state.all.map((p) => p.fullName).filter(Boolean))].sort();
    const tags = [...new Set(state.all.flatMap((p) => p.tags || []))].sort();

    $("nameList").innerHTML = names.map((n) => `<option value="${escapeHTML(n)}"></option>`).join("");
    $("tagList").innerHTML = tags.map((t) => `<option value="${escapeHTML(t)}"></option>`).join("");
  };

  const applyFilters = () => {
    const name = $("fName").value.trim().toLowerCase();
    const tag = $("fTag").value.trim().toLowerCase();

    state.filtered = state.all.filter((p) => {
      const nameOk = !name || (p.fullName || "").toLowerCase().includes(name);
      const tagOk = !tag || (p.tags || []).some((t) => t.toLowerCase().includes(tag));
      return nameOk && tagOk;
    });
    render();
  };

  // -------------------- Load --------------------

  const load = async () => {
    try {
      const result = await apiRequest("/admin/actions/performers");
      const list = result.data?.performers || result.data || [];

      state.all = Array.isArray(list) ? list : [];
      state.filtered = [...state.all];

      fillDatalists();
      render();
      showToast(result.message || "Performers fetched successfully");
    } catch (error) {
      $("pfLoading").hidden = true;
      $("pfError").hidden = false;
      $("pfError").textContent = error.message || "Unable to load performers.";
      showToast(error.message || "Unable to load performers.", true);
    }
  };

  // -------------------- Events --------------------

  const list = $("pfList");

  // Row click -> detail page (ignore clicks on the Hide toggle)
  list.addEventListener("click", (event) => {
    if (event.target.closest(".pf-switch")) return;
    const row = event.target.closest(".pf-row");
    if (row) window.location.href = `/admin/performer/${encodeURIComponent(row.dataset.id)}`;
  });

  list.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.target.closest(".pf-switch")) return;
    const row = event.target.closest(".pf-row");
    if (row) window.location.href = `/admin/performer/${encodeURIComponent(row.dataset.id)}`;
  });

  // Broken Cloudinary image -> fall back to the initial (error events don't bubble, so capture)
  list.addEventListener("error", (event) => {
    const img = event.target;
    if (img.tagName !== "IMG") return;
    img.parentElement.textContent = img.dataset.initial || "?";
  }, true);

  // Hide toggle -> PATCH visibility
  list.addEventListener("change", async (event) => {
    const box = event.target.closest("input[data-toggle]");
    if (!box) return;

    const id = box.dataset.toggle;
    const performer = state.all.find((p) => p.id === id);
    if (!performer) return;

    const wantHidden = box.checked;
    box.disabled = true;

    try {
      const result = await apiRequest(
        `/admin/actions/performer/visibility/${encodeURIComponent(id)}`,
        {
          method: "PATCH",
          body: JSON.stringify({ visibility: wantHidden ? "hidden" : "visible" }),
        }
      );

      // Trust the backend's value if it sends one, otherwise use what we asked for.
      const confirmed = result.data?.visibility || (wantHidden ? "hidden" : "visible");
      performer.visibility = confirmed;
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

  $("pfFilter").addEventListener("submit", (event) => {
    event.preventDefault();
    applyFilters();
  });

  $("fReset").addEventListener("click", () => {
    $("fName").value = "";
    $("fTag").value = "";
    applyFilters();
  });

  load();
})();