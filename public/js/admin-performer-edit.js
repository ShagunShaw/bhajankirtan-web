(() => {
  const $ = (id) => document.getElementById(id);
  const performerId = $("peRoot").dataset.performerId;

  const LIMITS = { photos: 10, videos: 5 };
  let orig = null;
  const state = {
    tags: [],
    newProfile: null, removeProfile: false,
    keepPhotos: [], newPhotos: [],
    keepVideos: [], newVideos: [],
  };

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
  const tagName = (t) => String(t.displayName || t.name || t);

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
    const input = $(key === "tags" ? "tagBox" : key);
    if (!input) return;
    (input.closest(".pf-field") || input).classList.toggle("has-error", !!message);
  };

  // -------------------- Tags --------------------

  const renderTags = () => {
    $("tagChips").innerHTML = state.tags
      .map((t, i) => `<span class="pn-chip">${escapeHTML(t)}<button type="button" data-rm="${i}" aria-label="Remove ${escapeHTML(t)}">×</button></span>`)
      .join("");
  };

  const addTags = (raw) => {
    raw.split(",").map((s) => s.trim()).filter(Boolean).forEach((t) => {
      if (!state.tags.some((x) => x.toLowerCase() === t.toLowerCase())) state.tags.push(t);
    });
    renderTags();
    if (state.tags.length) setError("tags", "");
  };

    // ---- Tag suggestions ----

  let knownTags = [];
  let sugIndex = -1;
  let sugItems = [];

  const sugList = document.createElement("div");
  sugList.className = "pn-sug";
  sugList.hidden = true;
  $("tagBox").appendChild(sugList);

  const normTag = (s) => String(s).toLowerCase().replace(/[_\-\s]+/g, " ").trim();

  const lev = (a, b) => {
    const dp = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) dp[0][j] = j;
    for (let i = 1; i <= a.length; i++)
      for (let j = 1; j <= b.length; j++)
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
        );
    return dp[a.length][b.length];
  };

  const score = (q, tag) => {
    const n = normTag(tag);
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

  const hideSug = () => { sugList.hidden = true; sugIndex = -1; sugItems = []; };

  const paintSug = () => {
    sugList.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", i === sugIndex));
  };

  const showSug = () => {
    const raw = $("tagInput").value.trim();
    const q = normTag(raw);
    if (!q) return hideSug();

    const taken = new Set(state.tags.map((t) => normTag(t)));
    sugItems = knownTags
      .filter((t) => !taken.has(normTag(t)))
      .map((t) => ({ t, s: score(q, t) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s || a.t.localeCompare(b.t))
      .slice(0, 6)
      .map((x) => x.t);

    const isExact = knownTags.some((t) => normTag(t) === q);
    sugIndex = -1;

    sugList.innerHTML =
      sugItems.map((t, i) => `<button type="button" data-pick="${i}">${escapeHTML(t)}</button>`).join("") +
      (isExact || taken.has(q)
        ? ""
        : `<div class="pn-sug-new">Press Enter to add "<b>${escapeHTML(raw)}</b>" as a new tag</div>`);

    sugList.hidden = !sugList.innerHTML;
  };

  const pickSug = (i) => {
    if (!sugItems[i]) return;
    addTags(sugItems[i]);
    $("tagInput").value = "";
    hideSug();
    $("tagInput").focus();
  };

  $("tagInput").addEventListener("input", showSug);

  $("tagInput").addEventListener("keydown", (e) => {
    const input = e.target;

    if (e.key === "ArrowDown" && sugItems.length) {
      e.preventDefault();
      sugIndex = (sugIndex + 1) % sugItems.length;
      paintSug();
    } else if (e.key === "ArrowUp" && sugItems.length) {
      e.preventDefault();
      sugIndex = sugIndex <= 0 ? sugItems.length - 1 : sugIndex - 1;
      paintSug();
    } else if (e.key === "Escape") {
      hideSug();
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (e.key === "Enter" && sugIndex >= 0) return pickSug(sugIndex);
      addTags(input.value);
      input.value = "";
      hideSug();
    } else if (e.key === "Backspace" && !input.value && state.tags.length) {
      state.tags.pop();
      renderTags();
    }
  });

  // mousedown (not click) so the input doesn't blur and add the half-typed text first
  sugList.addEventListener("mousedown", (e) => {
    const btn = e.target.closest("[data-pick]");
    if (!btn) return;
    e.preventDefault();
    pickSug(Number(btn.dataset.pick));
  });

  $("tagInput").addEventListener("blur", (e) => {
    addTags(e.target.value);
    e.target.value = "";
    hideSug();
  });

  // Load existing tags once. If this fails the field still works, just without suggestions.
  (async () => {
    try {
      const res = await fetch("/admin/actions/tags", {
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });
      const result = await res.json();
      if (!res.ok || result.success === false) return;
      const raw = Array.isArray(result.data) ? result.data : result.data?.tags || [];
      knownTags = [...new Set(
        raw.map((t) => (typeof t === "string" ? t : t.name || t.displayName)).filter(Boolean)
      )];
    } catch { /* suggestions are optional */ }
  })();
  
  $("tagBox").addEventListener("click", (e) => {
    const rm = e.target.closest("[data-rm]");
    if (rm) { state.tags.splice(Number(rm.dataset.rm), 1); renderTags(); return; }
    $("tagInput").focus();
  });

  // -------------------- Profile photo --------------------

  const renderProfile = () => {
    const current = !state.removeProfile && isUrl(orig.profilePhoto) ? orig.profilePhoto : "";
    const f = state.newProfile;
    let html = "No photo";

    if (f) {
      const src = preview(f, renderProfile);
      html = src ? `<img src="${src}" alt="New profile photo">` : "Loading…";
    } else if (current) {
      html = `<img src="${escapeHTML(cld(current, "w_240,h_280,c_fill,g_face,q_auto,f_auto"))}" alt="Current profile photo">`;
    }

    $("profilePrev").innerHTML = html;
    $("profileName").textContent = f
      ? `New: ${f.name} · ${size(f.size)}`
      : current ? "Current photo" : state.removeProfile ? "Photo will be removed on save." : "No profile photo.";
    $("profileClear").hidden = !(f || current);
    $("profilePick").textContent = f || current ? "Change photo" : "Choose photo";
  };

  $("profilePick").addEventListener("click", () => $("profileInput").click());
  $("profileInput").addEventListener("change", (e) => {
    const f = e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) return showToast("Profile photo must be an image.", true);
    state.newProfile = f;
    state.removeProfile = false;
    renderProfile();
  });
  $("profileClear").addEventListener("click", () => {
    if (state.newProfile) state.newProfile = null;
    else state.removeProfile = true;
    renderProfile();
  });

  // -------------------- Work photos / videos --------------------

  const renderPhotos = () => {
    const total = state.keepPhotos.length + state.newPhotos.length;
    $("photoCount").textContent = `${total} / ${LIMITS.photos}`;

    const oldHTML = state.keepPhotos.map((url, i) =>
      `<div class="pn-thumb">${isUrl(url) ? `<img src="${escapeHTML(cld(url, "w_300,q_auto,f_auto"))}" alt="Work photo">` : ""}<button type="button" data-rm-old="${i}" aria-label="Remove photo">×</button></div>`);

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

    ["fullName", "basePrice", "tags"].forEach((k) => setError(k, ""));

    if (!$("fullName").value.trim()) fail("fullName", "Full name cannot be empty.");

    const price = Number($("basePrice").value);
    if ($("basePrice").value === "") fail("basePrice", "Base price cannot be empty.");
    else if (!Number.isFinite(price) || price < 1) fail("basePrice", "Enter a valid price of at least 1.");

    addTags($("tagInput").value);
    $("tagInput").value = "";
    if (!state.tags.length) fail("tags", "Add at least one tag.");

    if (!ok) document.querySelector(".has-error")?.scrollIntoView({ behavior: "smooth", block: "center" });
    return ok;
  };

  const sameList = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

  // Builds a FormData containing ONLY the edited fields.
  const buildChanges = () => {
    const fd = new FormData();
    let changed = 0;
    const add = (k, v) => { fd.append(k, v); };

    const fullName = $("fullName").value.trim();
    if (fullName !== (orig.fullName || "")) { add("fullName", fullName); changed++; }

    const about = $("about").value.trim();
    if (about !== (orig.about || "")) { add("about", about); changed++; }

    const price = Number($("basePrice").value);
    if (price !== Number(orig.basePrice)) { add("basePrice", price); changed++; }

    const experience = $("experience").value.trim();
    if (experience !== (orig.experience || "")) { add("experience", experience); changed++; }

    if ($("visibility").value !== (orig.visibility || "visible")) { add("visibility", $("visibility").value); changed++; }

    const norm = (arr) => arr.map((t) => t.toLowerCase()).sort();
    if (!sameList(norm(state.tags), norm((orig.tags || []).map(tagName)))) {
      state.tags.forEach((t) => add("tags", t));
      changed++;
    }

    if (state.newProfile) { add("profilePhoto", state.newProfile); changed++; }
    else if (state.removeProfile && orig.profilePhoto) { add("profilePhoto", ""); changed++; }

    const origPhotos = orig.workPhotos || [];
    if (state.newPhotos.length || !sameList(state.keepPhotos, origPhotos)) {
      add("existingPhotos", JSON.stringify(state.keepPhotos));
      state.newPhotos.forEach((f) => fd.append("workPhotos", f));
      changed++;
    }

    const origVideos = orig.workVideos || [];
    if (state.newVideos.length || !sameList(state.keepVideos, origVideos)) {
      add("existingVideos", JSON.stringify(state.keepVideos));
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
      const result = await send(`/admin/actions/performer/${encodeURIComponent(performerId)}`, fd, (pct) => {
        $("pnBar").style.width = `${pct}%`;
        $("pnProgressText").textContent = pct < 100 ? `Uploading… ${pct}%` : "Processing files, please wait…";
      });

      showToast(result.message || "Performer updated successfully");
      setTimeout(() => {
        window.location.href = `/admin/performer/${encodeURIComponent(performerId)}`;
      }, 1200);
    } catch (error) {
      setBusy(false);
      showToast(error.message || "Could not update performer.", true);
    }
  });

  // -------------------- Load --------------------

  const fill = (p) => {
    orig = p;
    $("fullName").value = p.fullName || "";
    $("basePrice").value = p.basePrice ?? "";
    $("experience").value = p.experience || "";
    $("visibility").value = p.visibility === "hidden" ? "hidden" : "visible";
    $("about").value = p.about || "";

    state.tags = (p.tags || []).map(tagName);
    state.keepPhotos = [...(p.workPhotos || [])];
    state.keepVideos = [...(p.workVideos || [])];

    renderTags();
    renderProfile();
    renderPhotos();
    renderVideos();

    document.title = `Edit ${p.fullName} | BhajanKirtan`;
    $("peLoading").hidden = true;
    $("peForm").hidden = false;
  };

  (async () => {
    try {
      const result = await apiRequest(`/admin/actions/performer/${encodeURIComponent(performerId)}`);
      fill(result.data);
    } catch (error) {
      $("peLoading").hidden = true;
      $("peError").hidden = false;
      $("peError").textContent = error.message || "Unable to load this performer.";
    }
  })();
})();