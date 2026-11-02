(() => {
    const $ = (id) => document.getElementById(id);

    const LIMITS = { photos: 10, videos: 5 };
    const state = { tags: [], profile: null, photos: [], videos: [] };

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

    // -------------------- Errors --------------------

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

    $("tagInput").addEventListener("keydown", (e) => {
        const input = e.target;
        if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            addTags(input.value);
            input.value = "";
        } else if (e.key === "Backspace" && !input.value && state.tags.length) {
            state.tags.pop();
            renderTags();
        }
    });
    $("tagInput").addEventListener("blur", (e) => { addTags(e.target.value); e.target.value = ""; });
    $("tagBox").addEventListener("click", (e) => {
        const rm = e.target.closest("[data-rm]");
        if (rm) { state.tags.splice(Number(rm.dataset.rm), 1); renderTags(); return; }
        $("tagInput").focus();
    });

    // -------------------- Profile photo --------------------

    const renderProfile = () => {
        const f = state.profile;
        const src = f ? preview(f, renderProfile) : "";
        $("profilePrev").innerHTML = f
            ? (src ? `<img src="${src}" alt="Profile preview">` : "Loading…")
            : "No photo";
        $("profileName").textContent = f ? `${f.name} · ${size(f.size)}` : "Optional, but recommended.";
        $("profileClear").hidden = !f;
        $("profilePick").textContent = f ? "Change photo" : "Choose photo";
    };

    $("profilePick").addEventListener("click", () => $("profileInput").click());
    $("profileInput").addEventListener("change", (e) => {
        const f = e.target.files[0];
        e.target.value = "";
        if (!f) return;
        if (!f.type.startsWith("image/")) return showToast("Profile photo must be an image.", true);
        state.profile = f;
        renderProfile();
    });
    $("profileClear").addEventListener("click", () => {
        state.profile = null;
        renderProfile();
    });

    // -------------------- Work photos / videos --------------------

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

        ["fullName", "basePrice", "tags"].forEach((k) => setError(k, ""));

        if (!$("fullName").value.trim()) fail("fullName", "Full name is required.");

        const price = Number($("basePrice").value);
        if ($("basePrice").value === "") fail("basePrice", "Base price is required.");
        else if (!Number.isFinite(price) || price <= 0) fail("basePrice", "Enter a valid price greater than 0.");

        addTags($("tagInput").value);
        $("tagInput").value = "";
        if (!state.tags.length) fail("tags", "Add at least one tag.");

        if (!ok) {
            const first = document.querySelector(".has-error");
            first?.scrollIntoView({ behavior: "smooth", block: "center" });
        }
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

        if (!state.profile &&
            !window.confirm("Saving performer without a profile photo, confirm submit?")) return;

        const fd = new FormData();
        fd.append("fullName", $("fullName").value.trim());
        fd.append("basePrice", $("basePrice").value);
        fd.append("visibility", $("visibility").value);
        state.tags.forEach((t) => fd.append("tags", t));
        if ($("about").value.trim()) fd.append("about", $("about").value.trim());
        if ($("experience").value.trim()) fd.append("experience", $("experience").value.trim());
        if (state.profile) fd.append("profilePhoto", state.profile);
        state.photos.forEach((f) => fd.append("workPhotos", f));
        state.videos.forEach((f) => fd.append("workVideos", f));

        setBusy(true);
        $("pnBar").style.width = "0%";
        $("pnProgressText").textContent = "Uploading… 0%";

        try {
            const result = await upload("/admin/actions/performer", fd, (pct) => {
                $("pnBar").style.width = `${pct}%`;
                $("pnProgressText").textContent = pct < 100 ? `Uploading… ${pct}%` : "Processing files, please wait…";
            });

            showToast(result.message || "Performer created successfully");
            const id = result.data?._id || result.data?.id;
            setTimeout(() => {
                window.location.href = id ? `/admin/performer/${encodeURIComponent(id)}` : "/admin/performers";
            }, 1200);
        } catch (error) {
            setBusy(false);
            showToast(error.message || "Could not create performer.", true);
        }
    });

    renderProfile();
    renderPhotos();
    renderVideos();
})();