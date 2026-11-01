(() => {
  const $ = (id) => document.getElementById(id);

  const PACKAGES_URL = "/api/package/";

  const state = {
    bookings: [],
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    searchMode: false,
    performers: null,
    packages: null,
    activeBooking: null,
    currentAction: null,
  };

  const modal = $("adminActionModal");
  const modalTitle = $("actionModalTitle");
  const modalBody = $("actionModalBody");
  const modalFooter = $("actionModalFooter");
  const modalIcon = $("actionModalIcon");

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  const money = (amount) =>
    amount == null ? "—" : `₹${Number(amount).toLocaleString("en-IN")}`;

  const formatDate = (date) => {
    if (!date) return "—";
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime())
      ? escapeHTML(date)
      : parsed.toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
  };

  const showToast = (message) => {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 2600);
  };

  const showModal = (title, body, buttons, icon = "🙏") => {
    modalTitle.textContent = title;
    modalBody.innerHTML = body;
    modalFooter.innerHTML = buttons;
    modalIcon.textContent = icon;
    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modalBody.innerHTML = "";
    modalFooter.innerHTML = "";
    state.currentAction = null;
  };

  const parseResponse = async (response) => {
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

    return parseResponse(response);
  };

  // -------------------- Performers --------------------

  const getPerformers = async () => {
    if (state.performers) return state.performers;

    const result = await apiRequest("/admin/actions/performers");
    const list = result.data?.performers || result.data || [];

    state.performers = Array.isArray(list) ? list : [];
    return state.performers;
  };

  const performerOptions = (selectedId = "") => {
    return (state.performers || []).map((p) => `
      <option value="${escapeHTML(p.id || p._id)}"
        ${(p.id || p._id) === selectedId ? "selected" : ""}>
        ${escapeHTML(p.fullName || p.name)}
        · ${money(p.basePrice)}
        · ${escapeHTML(p.visibility || "")}
        · ${escapeHTML((p.tags || []).join(", "))}
      </option>
    `).join("");
  };

  // -------------------- Packages (filter) --------------------

  const getPackages = async () => {
    if (state.packages) return state.packages;

    const result = await apiRequest(PACKAGES_URL);
    const list = result.data?.packages || result.data || [];

    state.packages = Array.isArray(list) ? list : [];
    return state.packages;
  };

  const loadPackageFilter = async () => {
    try {
      const packages = await getPackages();

      $("filterPackage").innerHTML =
        `<option value="">All packages</option>` +
        packages.map((p) => `
          <option value="${escapeHTML(p._id || p.id)}">
            ${escapeHTML(p.packageName)}
          </option>
        `).join("");
    } catch (error) {
      console.error("Could not load package filters:", error);
    }
  };

  // -------------------- Table rendering --------------------

  const renderBooking = (b) => {
    const status = b.status || "requested";
    const type = b.bookingType || "solo";

    let actions = "";

    if (status === "requested") {
      actions = `
        <button class="btn btn-confirm" data-act="confirm" data-id="${escapeHTML(b.bookingId)}">Confirm</button>
        <button class="btn btn-reject" data-act="reject" data-id="${escapeHTML(b.bookingId)}">Reject</button>
        <button class="btn btn-cancel" data-act="cancel" data-id="${escapeHTML(b.bookingId)}">Cancel</button>
      `;
    } else if (status === "confirmed") {
      actions = `
        <button class="btn btn-reallot" data-act="reallot" data-id="${escapeHTML(b.bookingId)}">Reallot</button>
        <button class="btn btn-cancel" data-act="cancel" data-id="${escapeHTML(b.bookingId)}">Cancel</button>
      `;
    }

    const details = type === "package"
      ? escapeHTML(b.packageName || "Package")
      : escapeHTML(b.requestedPerformer?.name || "—");

    const assigned = (b.allotments || [])
      .filter((a) => a.status === "assigned")
      .map((a) => a.performerName)
      .filter(Boolean);

    const detailsHTML = `
      <span class="type-pill ${type}">${escapeHTML(type)}</span>
      <span class="booking-sub">${details}</span>
      ${assigned.length
        ? `<span class="booking-sub">Assigned: ${escapeHTML(assigned.join(", "))}</span>`
        : ""}
    `;

    return `
      <tr>
        <td>
          <span class="booking-ref">${escapeHTML(b.referenceId)}</span>
          <span class="booking-sub">${escapeHTML(b.eventTime || "")}</span>
        </td>

        <td>
          <span class="customer-name">${escapeHTML(b.customer?.name || "—")}</span>
          <span class="booking-sub">${escapeHTML(b.customer?.phone || "")}</span>
          <span class="booking-sub">${escapeHTML(b.customer?.email || "")}</span>
        </td>

        <td>
          <span class="event-name">${escapeHTML(b.eventType || "—")}</span>
          <span class="booking-sub">${escapeHTML(b.eventAddress || "")}</span>
        </td>

        <td class="booking-date">${formatDate(b.eventDate)}</td>

        <td>${detailsHTML}</td>

        <td class="amount-cell">
          ${money(b.finalAmount ?? b.quotedAmount)}
        </td>

        <td>
          <span class="status-pill ${escapeHTML(status)}">
            ${status === "requested" ? "Pending" : escapeHTML(status)}
          </span>
        </td>

        <td>
          <div class="row-actions">
            ${actions || `<span class="status-pill ${escapeHTML(status)}">${escapeHTML(status)}</span>`}
          </div>
        </td>
      </tr>
    `;
  };

  const renderTable = () => {
    $("bookingsBody").innerHTML = state.bookings.map(renderBooking).join("");

    $("totalBookings").textContent = state.total;
    $("resultSummary").textContent =
      `Showing ${state.bookings.length} of ${state.total} bookings`;

    $("tableLoading").hidden = true;
    $("tableError").hidden = true;

    const hasBookings = state.bookings.length > 0;
    $("tableContainer").hidden = !hasBookings;
    $("emptyBookings").hidden = hasBookings;

    $("pagination").hidden = !hasBookings;
    $("pageInfo").textContent =
      `Page ${state.page} of ${Math.max(1, state.totalPages)}`;

    $("prevPage").disabled = state.page <= 1;
    $("nextPage").disabled = state.page >= state.totalPages;
  };

  const showLoading = () => {
    $("tableLoading").hidden = false;
    $("tableError").hidden = true;
    $("tableContainer").hidden = true;
    $("emptyBookings").hidden = true;
    $("pagination").hidden = true;
    $("cleanupNotice").hidden = true;
  };

  const showError = (message) => {
    $("tableLoading").hidden = true;
    $("tableContainer").hidden = true;
    $("emptyBookings").hidden = true;
    $("pagination").hidden = true;
    $("tableError").hidden = false;
    $("tableError").textContent = message;
  };

  // -------------------- Fetch bookings --------------------

  const fetchBookings = async (search = false, page = 1) => {
    showLoading();

    state.page = page;
    state.searchMode = search;

    const params = new URLSearchParams({
      page: String(page),
      limit: String(state.limit),
    });

    if (search) {
      const fromDate = $("fromDate").value;
      const toDate = $("toDate").value;
      const status = $("filterStatus").value;
      const performerId = $("filterPerformer").value;
      const packageId = $("filterPackage").value;

      if (fromDate) params.set("fromDate", fromDate);
      if (toDate) params.set("toDate", toDate);
      if (status) params.set("status", status);
      if (performerId) params.set("performerId", performerId);
      if (packageId) params.set("packageId", packageId);
    }

    try {
      const url = search
        ? `/admin/bookings/search?${params}`
        : `/admin/bookings/data?${params}`;

      const result = await apiRequest(url);
      const data = result.data || {};

      state.bookings = data.bookings || [];
      state.total = data.total ?? data.pagination?.total ?? 0;
      state.page = data.page ?? data.pagination?.page ?? page;
      state.limit = data.limit ?? data.pagination?.limit ?? state.limit;
      state.totalPages = data.totalPages ??
        data.pagination?.totalPages ??
        Math.max(1, Math.ceil(state.total / state.limit));

      $("cleanupNotice").hidden = !data.cleanedUp;

      if (data.cleanedUp) {
        $("cleanupNotice").textContent =
          result.message || `Older bookings have been moved from the database.`;
      }

      renderTable();
    } catch (error) {
      showError(error.message || "Unable to load bookings.");
    }
  };

  // -------------------- Modal helpers --------------------

  const actionButtons = (confirmText, action) => `
    <button type="button" class="btn" data-modal-action="close">Close</button>
    <button type="button" class="btn btn-confirm" data-modal-action="${action}">
      ${confirmText}
    </button>
  `;

  const showSuccess = (message) => {
    showModal(
      "Action Successful",
      `<div class="modal-message">${escapeHTML(message)}</div>`,
      `<button type="button" class="btn btn-confirm" data-modal-action="reload">OKK</button>`,
      "🙏"
    );
  };

  const submitAction = async (url, body = {}) => {
    try {
      const result = await apiRequest(url, {
        method: "POST",
        body: JSON.stringify(body),
      });

      showSuccess(result.message || "Booking updated successfully.");
    } catch (error) {
      showModal(
        "Action Failed",
        `<div class="modal-message">${escapeHTML(error.message)}</div>`,
        `<button type="button" class="btn btn-confirm" data-modal-action="close">OKK</button>`,
        "⚠️"
      );
    }
  };

  // -------------------- Confirm --------------------

  const openConfirm = async (booking) => {
    state.activeBooking = booking;
    state.currentAction = "confirm";

    try {
      await getPerformers();

      const isPackage = booking.bookingType === "package";

      const body = `
        <p>Confirm booking <strong>${escapeHTML(booking.referenceId)}</strong>?</p>

        <div class="form-section">
          <label>Final amount (₹)</label>
          <input id="confirmAmount" type="number" min="0"
            placeholder="${escapeHTML(booking.quotedAmount ?? "")}">
          <label>Reason for price change (if applicable)</label>
          <textarea id="confirmPriceReason" rows="2"
            placeholder="Enter reason if amount is changed"></textarea>
        </div>

        ${isPackage ? `
          <div class="form-section">
            <label>Package allotments</label>
            <div id="confirmAllotmentRows"></div>
            <button type="button" class="btn btn-add-row" id="addAllotmentRow">
              + Add performer
            </button>
          </div>
        ` : `
          <div class="form-section">
            <label>Performer (optional change)</label>
            <select id="confirmPerformer">
              <option value="">Keep requested performer</option>
              ${performerOptions()}
            </select>
          </div>
        `}

        <div class="form-section">
          <label class="modal-check">
            <input type="checkbox" id="confirmIgnoreConflicts">
            Ignore Conflicts
          </label>
          <small class="field-help">
            If turned on, existing bookings for an allotted performer on the
            same day will not block this confirmation.
          </small>
        </div>
      `;

      showModal(
        "Confirm Booking",
        body,
        actionButtons("Confirm Booking", "confirm-submit"),
        "🙏"
      );

      if (isPackage) {
        addAllotmentRow();

        $("addAllotmentRow").addEventListener("click", addAllotmentRow);
      }
    } catch (error) {
      showModal(
        "Unable to load performers",
        escapeHTML(error.message),
        `<button type="button" class="btn btn-confirm" data-modal-action="close">OKK</button>`,
        "⚠️"
      );
    }
  };

  const addAllotmentRow = () => {
    const container = $("confirmAllotmentRows");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "allotment-form-row booking-allotment-row";

    row.innerHTML = `
      <select class="allotment-performer">
        <option value="">Select performer</option>
        ${performerOptions()}
      </select>
      <input class="allotment-role" type="text" placeholder="Role (optional)">
      <button type="button" class="btn btn-remove-row">×</button>
    `;

    row.querySelector(".btn-remove-row").addEventListener("click", () => {
      row.remove();
    });

    container.appendChild(row);
  };

  const submitConfirm = async () => {
    const booking = state.activeBooking;
    if (!booking) return;

    const amount = $("confirmAmount").value;
    const reason = $("confirmPriceReason").value.trim();
    const ignoreConflicts = $("confirmIgnoreConflicts").checked;

    const body = {};

    if (amount !== "") body.finalAmount = Number(amount);
    if (reason) body.priceChangeReason = reason;
    if (ignoreConflicts) body.ignoreConflicts = true;

    if (booking.bookingType === "package") {
      const rows = [...document.querySelectorAll(".booking-allotment-row")];

      const allotments = rows.map((row) => ({
        performerId: row.querySelector(".allotment-performer").value,
        role: row.querySelector(".allotment-role").value.trim(),
      }));

      if (!allotments.length || allotments.some((a) => !a.performerId)) {
        showToast("Please select at least one performer for the package.");
        return;
      }

      body.allotments = allotments;
    } else {
      const performerId = $("confirmPerformer").value;
      if (performerId) body.performerId = performerId;
    }

    closeModal();

    await submitAction(
      `/admin/actions/confirm/${encodeURIComponent(booking.bookingId)}`,
      body
    );
  };

  // -------------------- Reject --------------------

  const openReject = (booking) => {
    state.activeBooking = booking;

    showModal(
      "Reject Booking",
      `<p>Are you sure you want to reject booking
        <strong>${escapeHTML(booking.referenceId)}</strong>?</p>`,
      actionButtons("Reject Booking", "reject-submit"),
      "⚠️"
    );
  };

  const submitReject = async () => {
    const booking = state.activeBooking;
    if (!booking) return;

    closeModal();

    await submitAction(
      `/admin/actions/reject/${encodeURIComponent(booking.bookingId)}`
    );
  };

  // -------------------- Cancel --------------------

  const openCancel = (booking) => {
    state.activeBooking = booking;

    showModal(
      "Cancel Booking",
      `
        <p>Cancel booking <strong>${escapeHTML(booking.referenceId)}</strong>?</p>

        <div class="form-section">
          <label>Cancelled by</label>
          <select id="cancelledBy">
            <option value="">Select</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="performer">Performer</option>
          </select>

          <label>Cancellation reason</label>
          <textarea id="cancelReason" rows="3"
            placeholder="Enter cancellation reason"></textarea>
        </div>
      `,
      actionButtons("Cancel Booking", "cancel-submit"),
      "⚠️"
    );
  };

  const submitCancel = async () => {
    const booking = state.activeBooking;
    if (!booking) return;

    const cancelledBy = $("cancelledBy").value;
    const reason = $("cancelReason").value.trim();

    if (!cancelledBy || !reason) {
      showToast("Please select who cancelled and enter a reason.");
      return;
    }

    closeModal();

    await submitAction(
      `/admin/actions/cancel/${encodeURIComponent(booking.bookingId)}`,
      { cancelledBy, cancelReason: reason }
    );
  };

  // -------------------- Reallot --------------------

  const openReallot = async (booking) => {
    state.activeBooking = booking;
    state.currentAction = "reallot";

    const closeBtn = `<button type="button" class="btn" data-modal-action="close">Close</button>`;

    showModal("Reallot Performers", `<p>Loading performers...</p>`, closeBtn, "🙏");

    try {
      await getPerformers();

      const allotments = (booking.allotments || []).filter(
        (a) => a.status === "assigned"
      );

      if (!allotments.length) {
        showModal(
          "Reallot Performers",
          `<p>This booking has no existing allotments to reassign.</p>`,
          closeBtn,
          "⚠️"
        );
        return;
      }

      const rows = allotments.map((allotment) => `
      <div class="reallot-row" data-old-id="${escapeHTML(allotment.allotmentId || "")}">
        <div class="reallot-old">
          <b>Current performer</b>
          <span>${escapeHTML(allotment.performerName || "Unknown performer")}</span>
        </div>

        <div>
          <label>New performer</label>
          <select class="reallot-performer">
            <option value="">Select performer</option>
            ${performerOptions()}
          </select>
        </div>

        <div>
          <label class="modal-check">
            <input type="checkbox" class="reallot-ignore">
            Ignore Conflicts
          </label>
          <p class="field-help">
            If turned on, existing bookings for the new performer on the
            same day will not block this reallotment.
          </p>
        </div>

        <div class="reallot-row-action">
          <button type="button" class="btn btn-reallot-row">Reallot</button>
        </div>
      </div>
    `).join("");

      showModal(
        "Reallot Performers",
        `
        <div class="reallot-list">${rows}</div>
        <p class="field-help">Click "All done" after completing the required reallotments.</p>
      `,
        `${closeBtn}
       <button type="button" class="btn btn-confirm" data-modal-action="reload">All done</button>`,
        "🙏"
      );

      modalBody.querySelectorAll(".reallot-row").forEach((row) => {
        const button = row.querySelector(".btn-reallot-row");

        button.addEventListener("click", async () => {
          const oldAllotmentId = row.dataset.oldId;
          const newPerformerId = row.querySelector(".reallot-performer").value;
          const ignoreConflicts = row.querySelector(".reallot-ignore").checked;

          if (!oldAllotmentId || !newPerformerId) {
            showToast("Select a new performer first.");
            return;
          }

          const body = { oldAllotmentId, newPerformerId };
          if (ignoreConflicts) body.ignoreConflicts = true;

          button.disabled = true;
          button.textContent = "Saving...";

          try {
            const result = await apiRequest(
              `/admin/actions/reallot/${encodeURIComponent(booking.bookingId)}`,
              { method: "POST", body: JSON.stringify(body) }
            );

            button.outerHTML = `<span class="tag-ok">✔ Reallotted</span>`;
            showToast(result.message || "Performer reallotted successfully.");
          } catch (error) {
            button.disabled = false;
            button.textContent = "Reallot";
            showToast(error.message || "Reallotment failed.");
          }
        });
      });
    } catch (error) {
      showModal(
        "Unable to Load Performers",
        `<div class="modal-message">${escapeHTML(error.message)}</div>`,
        closeBtn,
        "⚠️"
      );
    }
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const booking = state.bookings.find(
      (b) => b.bookingId === button.dataset.id
    );

    if (!booking) return;

    switch (button.dataset.act) {
      case "confirm": openConfirm(booking); break;
      case "reject": openReject(booking); break;
      case "cancel": openCancel(booking); break;
      case "reallot": openReallot(booking); break;
    }
  });

  modalFooter.addEventListener("click", (event) => {
    const button = event.target.closest("[data-modal-action]");
    if (!button) return;

    switch (button.dataset.modalAction) {
      case "close":
        closeModal();
        break;
      case "reload":
        window.location.reload();
        break;
      case "confirm-submit":
        submitConfirm();
        break;
      case "reject-submit":
        submitReject();
        break;
      case "cancel-submit":
        submitCancel();
        break;
    }
  });

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal();
  });

  $("applyFilters").addEventListener("click", () => {
    if ($("fromDate").value && $("toDate").value &&
      $("fromDate").value > $("toDate").value) {
      showToast("From date cannot be later than To date.");
      return;
    }

    fetchBookings(true, 1);
  });

  $("resetFilters").addEventListener("click", () => {
    $("fromDate").value = "";
    $("toDate").value = "";
    $("filterStatus").value = "";
    $("filterPerformer").value = "";
    $("filterPackage").value = "";
    fetchBookings(false, 1);
  });

  $("refreshBookings").addEventListener("click", () => {
    fetchBookings(state.searchMode, state.page);
  });

  $("prevPage").addEventListener("click", () => {
    if (state.page > 1) fetchBookings(state.searchMode, state.page - 1);
  });

  $("nextPage").addEventListener("click", () => {
    if (state.page < state.totalPages) {
      fetchBookings(state.searchMode, state.page + 1);
    }
  });

  // Load performer options for the filter.
  const loadPerformerFilter = async () => {
    try {
      const performers = await getPerformers();

      $("filterPerformer").innerHTML += performers.map((p) => `
        <option value="${escapeHTML(p.id || p._id)}">
          ${escapeHTML(p.fullName || p.name)}
        </option>
      `).join("");
    } catch (error) {
      console.error("Could not load performer filters:", error);
    }
  };

  // Initial page load: fetch all bookings, not the search endpoint.
  loadPerformerFilter();
  loadPackageFilter();
  fetchBookings(false, 1);
})();