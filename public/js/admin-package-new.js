(() => {
  const $ = (id) => document.getElementById(id);

  const LIMITS = { photos: 8, videos: 3 };
  const state = { features: [], photos: [], videos: [] };

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

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

  let toastTimer;
  const showToast = (message, isError = false) => {
    const t = $("pfToast");
    t.textContent = message;
    t.classList.toggle("error", isError);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3500);
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
    $("photoCount").textContent = `${state.photos.length} / ${LIMITS.photos}`;
    $("photoGrid").innerHTML = state.photos
      .map((f, i) => {
        const src = preview(f, renderPhotos);
        return `<div class="pn-thumb">${src ? `<img src="${src}" alt="${escapeHTML(f.name)}">` : ""}<button type="button" data-rm="${i}" aria-label="Remove photo">×</button></div>`;
      })
      .join("");
    $("photoPick").disabled = state.photos.length >= LIMITS.photos;
  };

  const renderVideos = () => {
    $("videoCount").textContent = `${state.videos.length} / ${LIMITS.videos}`;
    $("videoList").innerHTML = state.videos
      .map((f, i) => `<li><span>${escapeHTML(f.name)}<small>${size(f.size)}</small></span><button type="button" data-rm="${i}">Remove</button></li>`)
      .join("");
    $("videoPick").disabled = state.videos.length >= LIMITS.videos;
  };

  const addFiles = (list, files, max, typePrefix, label, render) => {
    let skipped = 0, wrongType = 0;
    for (const f of files) {
      if (!f.type.startsWith(typePrefix)) { wrongType++; continue; }
      if (list.some((x) => fileKey(x) === fileKey(f))) continue;
      if (list.length >= max) { skipped++; continue; }
      list.push(f);
    }
    render();
    if (wrongType) showToast(`Only ${label} files are allowed here.`, true);
    else if (skipped) showToast(`Maximum ${max} ${label}s allowed. Extra files were skipped.`, true);
  };

  $("photoPick").addEventListener("click", () => $("photoInput").click());
  $("photoInput").addEventListener("change", (e) => {
    addFiles(state.photos, [...e.target.files], LIMITS.photos, "image/", "image", renderPhotos);
    e.target.value = "";
  });
  $("photoGrid").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (!rm) return;
    state.photos.splice(Number(rm.dataset.rm), 1);
    renderPhotos();
  });

  $("videoPick").addEventListener("click", () => $("videoInput").click());
  $("videoInput").addEventListener("change", (e) => {
    addFiles(state.videos, [...e.target.files], LIMITS.videos, "video/", "video", renderVideos);
    e.target.value = "";
  });
  $("videoList").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (!rm) return;
    state.videos.splice(Number(rm.dataset.rm), 1);
    renderVideos();
  });

  // -------------------- Validation --------------------

  const validate = () => {
    let ok = true;
    const fail = (key, msg) => { setError(key, msg); ok = false; };

    ["packageName", "price", "features"].forEach((k) => setError(k, ""));

    if (!$("packageName").value.trim()) fail("packageName", "Package name is required.");

    const price = Number($("price").value);
    if ($("price").value === "") fail("price", "Price is required.");
    else if (!Number.isFinite(price) || price < 1) fail("price", "Enter a valid price of at least 1.");

    addFeature($("featInput").value);
    $("featInput").value = "";
    if (!state.features.length) fail("features", "Add at least one feature.");

    if (!ok) document.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  };

  // -------------------- Submit --------------------

  const upload = (url, formData, onProgress) =>
    new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", url);
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
    $("pnSubmit").disabled = busy;
    $("pnSubmit").textContent = busy ? "Saving…" : "Submit";
    $("pnProgress").hidden = !busy;
    document.querySelectorAll("#pnForm input, #pnForm textarea, #pnForm select, #pnForm button")
      .forEach((el) => { if (el.id !== "pnSubmit") el.disabled = busy; });
    if (!busy) { renderPhotos(); renderVideos(); }
  };

  $("pnForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const fd = new FormData();
    fd.append("packageName", $("packageName").value.trim());
    fd.append("price", $("price").value);
    fd.append("visibility", $("visibility").value);
    if ($("description").value.trim()) fd.append("description", $("description").value.trim());
    state.features.forEach((f) => fd.append("bulletFeatures", f));
    state.photos.forEach((f) => fd.append("workPhotos", f));
    state.videos.forEach((f) => fd.append("workVideos", f));

    setBusy(true);
    $("pnBar").style.width = "0%";
    $("pnProgressText").textContent = "Uploading… 0%";

    try {
      const result = await upload("/admin/actions/package", fd, (pct) => {
        $("pnBar").style.width = `${pct}%`;
        $("pnProgressText").textContent = pct < 100 ? `Uploading… ${pct}%` : "Processing files, please wait…";
      });

      showToast(result.message || "Package created successfully");
      const id = result.data?._id || result.data?.id;
      setTimeout(() => {
        window.location.href = id ? `/admin/package/${encodeURIComponent(id)}` : "/admin/package";
      }, 1200);
    } catch (error) {
      setBusy(false);
      showToast(error.message || "Could not create package.", true);
    }
  });

  renderFeatures();
  renderPhotos();
  renderVideos();
})();