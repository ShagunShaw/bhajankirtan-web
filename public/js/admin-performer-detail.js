(() => {
  const $ = (id) => document.getElementById(id);
  const performerId = $("pdRoot").dataset.performerId;

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);

  const money = (n) => (n == null ? "—" : `₹${Number(n).toLocaleString("en-IN")}`);

  const formatDateTime = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "—"
      : d.toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
  };

  const isUrl = (v) => /^https?:\/\//i.test(v || "");

  const cld = (url, transform) =>
    /res\.cloudinary\.com/.test(url) && url.includes("/upload/")
      ? url.replace("/upload/", `/upload/${transform}/`)
      : url;

  const apiRequest = async (url) => {
    const response = await fetch(url, {
      credentials: "same-origin",
      headers: { Accept: "application/json" },
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

  let toastTimer;
const showToast = (message, isError = false) => {
  const t = $("pfToast");
  t.textContent = message;
  t.classList.toggle("error", isError);
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
};

  const photoTile = (src) =>
    isUrl(src)
      ? `<a class="pd-photo-tile" href="${escapeHTML(src)}" target="_blank" rel="noopener">
           <img src="${escapeHTML(cld(src, "w_500,q_auto,f_auto"))}" alt="Work photo" loading="lazy">
         </a>`
      : `<div class="pd-photo-tile">Not a valid image link:<br>${escapeHTML(src)}</div>`;

  const videoTile = (link) => {
  if (!isUrl(link)) {
    return `<div class="pd-photo-tile">Not a valid video link:<br>${escapeHTML(link)}</div>`;
  }
  // Cloudinary can give us a still frame of the video to use as the poster.
  const poster = /res\.cloudinary\.com/.test(link) && link.includes("/upload/")
    ? link.replace("/upload/", "/upload/so_0,w_640,q_auto/").replace(/\.[a-z0-9]+(\?.*)?$/i, ".jpg")
    : "";

  return `<div class="pd-video">
    <video controls preload="metadata" playsinline
      ${poster ? `poster="${escapeHTML(poster)}"` : ""}
      src="${escapeHTML(link)}"></video>
  </div>`;
};

  const render = (p) => {
    const hidden = p.visibility === "hidden";
    const initial = escapeHTML((p.fullName || "?").trim().charAt(0).toUpperCase());

    const photo = isUrl(p.profilePhoto)
      ? `<img src="${escapeHTML(cld(p.profilePhoto, "w_500,h_580,c_fill,g_face,q_auto,f_auto"))}"
            alt="${escapeHTML(p.fullName)}" data-initial="${initial}">`
      : initial;

    const tags = (p.tags || [])
      .map((t) => `<span class="pf-tag">${escapeHTML(t.displayName || t.name || t)}</span>`)
      .join("");

    const photos = (p.workPhotos || []).map(photoTile).join("");
    const videos = (p.workVideoLinks || []).map(videoTile).join("");

    document.title = `${p.fullName} | BhajanKirtan`;

    $("pdContent").innerHTML = `
      <section class="pd-hero">
        <div class="pd-photo">${photo}</div>
        <div>
          <h2>${escapeHTML(p.fullName)}</h2>
          <span class="pf-badge ${hidden ? "hidden" : "visible"}">${hidden ? "Hidden" : "Visible"}</span>
          <div class="pd-facts">
            <div class="pd-fact"><span>Base price</span><b>${money(p.basePrice)}</b></div>
            <div class="pd-fact"><span>Experience</span><b>${escapeHTML(p.experience || "—")}</b></div>
          </div>
          <div class="pf-tags">${tags || '<span class="pd-muted">No tags</span>'}</div>
        </div>
      </section>

      <section class="pd-card">
        <h3>About</h3>
        <p>${p.about ? escapeHTML(p.about) : '<span class="pd-muted">No description added.</span>'}</p>
      </section>

      <section class="pd-card">
        <h3>Work photos (${(p.workPhotos || []).length})</h3>
        ${photos ? `<div class="pd-photos">${photos}</div>` : '<p class="pd-muted">No photos added.</p>'}
      </section>

      <section class="pd-card">
        <h3>Work videos (${(p.workVideoLinks || []).length})</h3>
        ${videos ? `<div class="pd-videos">${videos}</div>` : '<p class="pd-muted">No videos added.</p>'}
      </section>

      <section class="pd-card">
        <h3>Record details</h3>
        <div class="pd-meta">
          <div>Performer ID<br><b>${escapeHTML(p._id || p.id || "")}</b></div>
          <div>Created<br><b>${formatDateTime(p.createdAt)}</b></div>
          <div>Last updated<br><b>${formatDateTime(p.updatedAt)}</b></div>
        </div>
      </section>
    `;

    $("pdLoading").hidden = true;
    $("pdContent").hidden = false;
  };

  // Broken profile image -> fall back to the initial
  $("pdContent").addEventListener("error", (event) => {
    const img = event.target;
    if (img.tagName === "IMG" && img.dataset.initial) {
      img.parentElement.textContent = img.dataset.initial;
    }
  }, true);

  (async () => {
  try {
    const result = await apiRequest(`/admin/actions/performer/${encodeURIComponent(performerId)}`);
    render(result.data);
    showToast(result.message || "Performer details fetched successfully");
  } catch (error) {
    $("pdLoading").hidden = true;
    $("pdError").hidden = false;
    $("pdError").textContent = error.message || "Unable to load this performer.";
    showToast(error.message || "Unable to load this performer.", true);
  }
})();

  // "Edit Performer" (#editPerformerBtn) intentionally has no action yet.
})();