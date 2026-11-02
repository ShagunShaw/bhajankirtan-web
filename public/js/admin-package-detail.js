(() => {
  const $ = (id) => document.getElementById(id);
  const packageId = $("pkRoot").dataset.packageId;

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

  let toastTimer;
  const showToast = (message, isError = false) => {
    const t = $("pfToast");
    t.textContent = message;
    t.classList.toggle("error", isError);
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove("show"), 3000);
  };

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

  const photoTile = (src) =>
    isUrl(src)
      ? `<a class="pd-photo-tile" href="${escapeHTML(src)}" target="_blank" rel="noopener">
           <img src="${escapeHTML(cld(src, "w_500,q_auto,f_auto"))}" alt="Package photo" loading="lazy">
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
    const features = (p.bulletFeatures || [])
      .map((f) => `<li>${escapeHTML(f)}</li>`)
      .join("");
    const photos = (p.workPhotos || []).map(photoTile).join("");
    const videos = (p.workVideos || []).map(videoTile).join("");

    document.title = `${p.packageName} | BhajanKirtan`;

    $("pkContent").innerHTML = `
      <section class="pk-hero">
        <div>
          <h2>${escapeHTML(p.packageName)}</h2>
          <span class="pf-badge ${hidden ? "hidden" : "visible"}">${hidden ? "Hidden" : "Visible"}</span>
        </div>
        <div>
          <small>Price</small>
          <span class="pk-price">${money(p.price)}</span>
        </div>
      </section>

      <section class="pd-card">
        <h3>Description</h3>
        <p>${p.description ? escapeHTML(p.description) : '<span class="pd-muted">No description added.</span>'}</p>
      </section>

      <section class="pd-card">
        <h3>What's included (${(p.bulletFeatures || []).length})</h3>
        ${features ? `<ul class="pk-feature-list">${features}</ul>` : '<p class="pd-muted">No features listed.</p>'}
      </section>

      <section class="pd-card">
        <h3>Work photos (${(p.workPhotos || []).length})</h3>
        ${photos ? `<div class="pd-photos">${photos}</div>` : '<p class="pd-muted">No photos added.</p>'}
      </section>

      <section class="pd-card">
        <h3>Work videos (${(p.workVideos || []).length})</h3>
        ${videos ? `<div class="pd-videos">${videos}</div>` : '<p class="pd-muted">No videos added.</p>'}
      </section>

      <section class="pd-card">
        <h3>Record details</h3>
        <div class="pd-meta">
          <div>Package ID<br><b>${escapeHTML(p._id || p.id || "")}</b></div>
          <div>Created<br><b>${formatDateTime(p.createdAt)}</b></div>
          <div>Last updated<br><b>${formatDateTime(p.updatedAt)}</b></div>
        </div>
      </section>
    `;

    $("pkLoading").hidden = true;
    $("pkContent").hidden = false;
  };

  (async () => {
    try {
      const result = await apiRequest(`/admin/actions/package/${encodeURIComponent(packageId)}`);
      render(result.data);
      showToast(result.message || "Package details fetched successfully");
    } catch (error) {
      $("pkLoading").hidden = true;
      $("pkError").hidden = false;
      $("pkError").textContent = error.message || "Unable to load this package.";
      showToast(error.message || "Unable to load this package.", true);
    }
  })();

    $("editPackageBtn").addEventListener("click", () => {
    window.location.href = `/admin/package/${encodeURIComponent(packageId)}/edit`;
  });
})();