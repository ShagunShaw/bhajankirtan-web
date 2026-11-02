(() => {
  const $ = (id) => document.getElementById(id);
  const packageId = $("peRoot").dataset.packageId;

  const LIMITS = { photos: 8, videos: 3 };
  let orig = null;
  const state = { features: [], keepPhotos: [], newPhotos: [], keepVideos: [], newVideos: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const isUrl = (v) => /^https?:\/\//i.test(v || "");
  const cld = (url, transform) =>
    /res\.cloudinary\.com/.test(url) && url.includes("/upload/")
      ? url.replace("/upload/", `/upload/${transform}/`)
      : url;

  const previews = new WeakMap();
  const preview = (file, rerender) => {
    if (!previews.has(file)) {
      previews.set(file, "");
      const reader = new FileReader();
      reader.onload = () => { previews.set(file, reader.result); rerender(); };
      reader.readAsDataURL(file);
    }
    return previews.get(file);
  };

  const fileKey = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);
  const fileLabel = (url) => decodeURIComponent((url.split("/").pop() || url).split("?")[0]);

  let toastTimer;
  const showToast = (message, isError = false) => {
    const t = $("pfToast");
    t.textContent = message;
    t.classList.toggle("error", isError);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
  };

  const apiRequest = async (url) => {
    const response = await fetch(url, { credentials: "same-origin", headers: { Accept: "application/json" } });
    let result;
    try { result = await response.json(); }
    catch { throw new Error("Invalid response received from server."); }
    if (response.status === 401 || response.status === 403) {
      window.location.href = "/admin/login";
      throw new Error("Your session has expired.");
    }
    if (!response.ok || result.success === false) throw new Error(result.errMessage || "Something went wrong.");
    return result;
  };

  const setError = (key, message) => {
    const el = $(`err-${key}`);
    if (el) el.textContent = message || "";
    const input = $(key === "features" ? "featBox" : key);
    if (!input) return;
    (input.closest(".pf-field") || input).classList.toggle("has-error", !!message);
  };

  // -------------------- Features --------------------

  const renderFeatures = () => {
    $("featChips").innerHTML = state.features
      .map((t, i) => `<span class="pn-chip">${escapeHTML(t)}<button type="button" data-rm="${i}" aria-label="Remove">×</button></span>`)
      .join("");
  };

  const addFeature = (raw) => {
    const t = raw.trim();
    if (t && !state.features.some((x) => x.toLowerCase() === t.toLowerCase())) state.features.push(t);
    renderFeatures();
    if (state.features.length) setError("features", "");
  };

  $("featInput").addEventListener("keydown", (e) => {
    const input = e.target;
    if (e.key === "Enter") {
      e.preventDefault();
      addFeature(input.value);
      input.value = "";
    } else if (e.key === "Backspace" && !input.value && state.features.length) {
      state.features.pop();
      renderFeatures();
    }
  });
  $("featInput").addEventListener("blur", (e) => { addFeature(e.target.value); e.target.value = ""; });
  $("featBox").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (rm) { state.features.splice(Number(rm.dataset.rm), 1); renderFeatures(); return; }
    $("featInput").focus();
  });

  // -------------------- Photos / videos --------------------

  const renderPhotos = () => {
    const total = state.keepPhotos.length + state.newPhotos.length;
    $("photoCount").textContent = `${total} / ${LIMITS.photos}`;

    const oldHTML = state.keepPhotos.map((url, i) =>
      `<div class="pn-thumb">${isUrl(url) ? `<img src="${escapeHTML(cld(url, "w_300,q_auto,f_auto"))}" alt="Package photo">` : ""}<button type="button" data-rm-old="${i}" aria-label="Remove photo">×</button></div>`);

    const newHTML = state.newPhotos.map((f, i) => {
      const src = preview(f, renderPhotos);
      return `<div class="pn-thumb">${src ? `<img src="${src}" alt="${escapeHTML(f.name)}">` : ""}<button type="button" data-rm-new="${i}" aria-label="Remove photo">×</button></div>`;
    });

    $("photoGrid").innerHTML = [...oldHTML, ...newHTML].join("");
    $("photoPick").disabled = total >= LIMITS.photos;
  };

  const renderVideos = () => {
    const total = state.keepVideos.length + state.newVideos.length;
    $("videoCount").textContent = `${total} / ${LIMITS.videos}`;

    const oldHTML = state.keepVideos.map((url, i) =>
      `<li><span>${escapeHTML(fileLabel(url))}<small>current</small></span><button type="button" data-rm-old="${i}">Remove</button></li>`);
    const newHTML = state.newVideos.map((f, i) =>
      `<li><span>${escapeHTML(f.name)}<small>${size(f.size)} · new</small></span><button type="button" data-rm-new="${i}">Remove</button></li>`);

    $("videoList").innerHTML = [...oldHTML, ...newHTML].join("");
    $("videoPick").disabled = total >= LIMITS.videos;
  };

  const addFiles = (kind, files, typePrefix, label, render) => {
    const keep = kind === "photos" ? state.keepPhotos : state.keepVideos;
    const list = kind === "photos" ? state.newPhotos : state.newVideos;
    const max = LIMITS[kind];
    let skipped = 0, wrongType = 0;

    for (const f of files) {
      if (!f.type.startsWith(typePrefix)) { wrongType++; continue; }
      if (list.some((x) => fileKey(x) === fileKey(f))) continue;
      if (keep.length + list.length >= max) { skipped++; continue; }
      list.push(f);
    }
    render();
    if (wrongType) showToast(`Only ${label} files are allowed here.`, true);
    else if (skipped) showToast(`Maximum ${max} ${label}s allowed. Extra files were skipped.`, true);
  };

  $("photoPick").addEventListener("click", () => $("photoInput").click());
  $("photoInput").addEventListener("change", (e) => {
    addFiles("photos", [...e.target.files], "image/", "image", renderPhotos);
    e.target.value = "";
  });
  $("photoGrid").addEventListener("click", (e) => {
    const old = e.target.closest("[data-rm-old]");
    const nw = e.target.closest("[data-rm-new]");
    if (old) state.keepPhotos.splice(Number(old.dataset.rmOld), 1);
    else if (nw) state.newPhotos.splice(Number(nw.dataset.rmNew), 1);
    else return;
    renderPhotos();
  });

  $("videoPick").addEventListener("click", () => $("videoInput").click());
  $("videoInput").addEventListener("change", (e) => {
    addFiles("videos", [...e.target.files], "video/", "video", renderVideos);
    e.target.value = "";
  });
  $("videoList").addEventListener("click", (e) => {
    const old = e.target.closest("[data-rm-old]");
    const nw = e.target.closest("[data-rm-new]");
    if (old) state.keepVideos.splice(Number(old.dataset.rmOld), 1);
    else if (nw) state.newVideos.splice(Number(nw.dataset.rmNew), 1);
    else return;
    renderVideos();
  });

  // -------------------- Validation + diff --------------------

  const validate = () => {
    let ok = true;
    const fail = (key, msg) => { setError(key, msg); ok = false; };

    ["packageName", "price", "features"].forEach((k) => setError(k, ""));

    if (!$("packageName").value.trim()) fail("packageName", "Package name cannot be empty.");

    const price = Number($("price").value);
    if ($("price").value === "") fail("price", "Price cannot be empty.");
    else if (!Number.isFinite(price) || price < 1) fail("price", "Enter a valid price of at least 1.");

    addFeature($("featInput").value);
    $("featInput").value = "";
    if (!state.features.length) fail("features", "Add at least one feature.");

    if (!ok) document.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  };

  const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // Builds a FormData containing ONLY the edited fields.
  const buildChanges = () => {
    const fd = new FormData();
    let changed = 0;

    const name = $("packageName").value.trim();
    if (name !== (orig.packageName || "")) { fd.append("packageName", name); changed++; }

    const description = $("description").value.trim();
    if (description !== (orig.description || "")) { fd.append("description", description); changed++; }

    const price = Number($("price").value);
    if (price !== Number(orig.price)) { fd.append("price", price); changed++; }

    if ($("visibility").value !== (orig.visibility || "visible")) { fd.append("visibility", $("visibility").value); changed++; }

    if (!sameList(state.features, orig.bulletFeatures || [])) {
      state.features.forEach((f) => fd.append("bulletFeatures", f));
      changed++;
    }

    if (state.newPhotos.length || !sameList(state.keepPhotos, orig.workPhotos || [])) {
      fd.append("existingPhotos", JSON.stringify(state.keepPhotos));
      state.newPhotos.forEach((f) => fd.append("workPhotos", f));
      changed++;
    }

    if (state.newVideos.length || !sameList(state.keepVideos, orig.workVideos || [])) {
      fd.append("existingVideos", JSON.stringify(state.keepVideos));
      state.newVideos.forEach((f) => fd.append("workVideos", f));
      changed++;
    }

    return { fd, changed };
  };

  // -------------------- Submit --------------------

  const send = (url, formData, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PATCH", url);
      xhr.setRequestHeader("Accept", "application/json");

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
      };
      xhr.onload = () => {
        let result;
        try { result = JSON.parse(xhr.responseText); }
        catch { return reject(new Error("Invalid response received from server.")); }

        if (xhr.status === 401 || xhr.status === 403) {
          window.location.href = "/admin/login";
          return reject(new Error("Your session has expired."));
        }
        if (xhr.status < 200 || xhr.status >= 300 || result.success === false) {
          return reject(new Error(result.errMessage || "Something went wrong."));
        }
        resolve(result);
      };
      xhr.onerror = () => reject(new Error("Network error. Please check your connection and try again."));
      xhr.send(formData);
    });

  const setBusy = (busy) => {
    $("peSubmit").disabled = busy;
    $("peSubmit").textContent = busy ? "Saving…" : "Edit";
    $("pnProgress").hidden = !busy;
    document.querySelectorAll("#peForm input, #peForm textarea, #peForm select, #peForm button")
      .forEach((el) => { if (el.id !== "peSubmit") el.disabled = busy; });
    if (!busy) { renderPhotos(); renderVideos(); }
  };

  $("peForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const { fd, changed } = buildChanges();
    if (!changed) return showToast("No changes to save.", true);

    setBusy(true);
    $("pnBar").style.width = "0%";
    $("pnProgressText").textContent = "Uploading… 0%";

    try {
      const result = await send(`/admin/actions/package/${encodeURIComponent(packageId)}`, fd, (pct) => {
        $("pnBar").style.width = `${pct}%`;
        $("pnProgressText").textContent = pct < 100 ? `Uploading… ${pct}%` : "Processing files, please wait…";
      });

      showToast(result.message || "Package updated successfully");
      setTimeout(() => {
        window.location.href = `/admin/package/${encodeURIComponent(packageId)}`;
      }, 1200);
    } catch (error) {
      setBusy(false);
      showToast(error.message || "Could not update package.", true);
    }
  });

  // -------------------- Load --------------------

  const fill = (p) => {
    orig = p;
    $("packageName").value = p.packageName || "";
    $("price").value = p.price ?? "";
    $("visibility").value = p.visibility === "hidden" ? "hidden" : "visible";
    $("description").value = p.description || "";

    state.features = [...(p.bulletFeatures || [])];
    state.keepPhotos = [...(p.workPhotos || [])];
    state.keepVideos = [...(p.workVideos || [])];

    renderFeatures();
    renderPhotos();
    renderVideos();

    document.title = `Edit ${p.packageName} | BhajanKirtan`;
    $("peLoading").hidden = true;
    $("peForm").hidden = false;
  };

  (async () => {
    try {
      const result = await apiRequest(`/admin/actions/package/${encodeURIComponent(packageId)}`);
      fill(result.data);
    } catch (error) {
      $("peLoading").hidden = true;
      $("peError").hidden = false;
      $("peError").textContent = error.message || "Unable to load this package.";
    }
  })();
})();