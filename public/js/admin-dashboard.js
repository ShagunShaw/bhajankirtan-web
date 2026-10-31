(() => {
  const $ = (id) => document.getElementById(id);

  const modal = $("adminActionModal");
  const modalTitle = $("actionModalTitle");
  const modalIcon = $("actionModalIcon");
  const modalBody = $("actionModalBody");
  const modalFooter = $("actionModalFooter");

  let activeBooking = null;
  let performerCache = null;
  let currentAction = null;

  const escapeHTML = (value = "") =>
    String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  const formatDate = (date) => {
    const [year, month, day] = date.split("-").map(Number);

    return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const showToast = (message) => {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2800);
  };

  const showModal = (title, body, buttons = [], icon = "🙏") => {
    modalTitle.textContent = title;
    modalIcon.textContent = icon;
    modalBody.innerHTML = body;

    modalFooter.innerHTML = buttons.map((button) => `
      <button type="button"
        class="btn ${button.className || ""}"
        data-modal-action="${escapeHTML(button.action)}"
        ${button.disabled ? "disabled" : ""}>
        ${escapeHTML(button.label)}
      </button>
    `).join("");

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
  };

  const closeModal = () => {
    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    modalBody.innerHTML = "";
    modalFooter.innerHTML = "";
    currentAction = null;
  };

  const showMessage = (title, message, reload = false, isError = false) => {
    showModal(
      title,
      `<p class="modal-message">${escapeHTML(message)}</p>`,
      [{ label: "OKK", action: reload ? "reload" : "close", className: "modal-ok" }],
      isError ? "⚠️" : "🙏"
    );
  };

  const parseResponse = async (response) => {
    let result;

    try {
      result = await response.json();
    } catch {
      throw new Error("The server returned an invalid response.");
    }

    if (response.status === 401 || response.status === 403) {
      window.location.replace("/admin/login");
      throw new Error("Your admin session has expired.");
    }

    if (!response.ok || result.success === false) {
      throw new Error(
        result.errMessage ||
        result.message ||
        "The requested action could not be completed."
      );
    }

    return result;
  };

  const apiRequest = async (url, method = "GET", body) => {
    const options = {
      method,
      credentials: "same-origin",
      headers: { Accept: "application/json" },
    };

    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);
    return parseResponse(response);
  };

  const getPerformers = async () => {
    if (performerCache) return performerCache;

    const result = await apiRequest("/admin/actions/performers");
    performerCache = Array.isArray(result.data)
      ? result.data
      : result.data?.performers || [];

    return performerCache;
  };

  const performerOption = (performer) => {
    const tags = Array.isArray(performer.tags)
      ? performer.tags.join(", ")
      : "";

    const label = [
      performer.fullName,
      performer.basePrice != null ? `₹${performer.basePrice}` : "",
      performer.visibility || "",
      tags,
    ].filter(Boolean).join(" | ");

    return `
      <option value="${escapeHTML(performer.id || performer._id)}">
        ${escapeHTML(label)}
      </option>
    `;
  };

  const performerSelect = (performers, className, selected = "") => `
    <select class="${className}" required>
      <option value="">Select performer</option>
      ${performers.map(performerOption).join("")}
    </select>
  `;

  const getRequestedPerformerName = (booking) => {
    const performer = booking.requestedPerformer;

    if (typeof performer === "string") return performer;

    return (
      performer?.fullName ||
      performer?.name ||
      performer?.performerName ||
      booking.requestedPerformerName ||
      "Not specified"
    );
  };

  const renderBooking = (booking) => {
    const bookingId = escapeHTML(booking.bookingId);
    const isPackage = booking.bookingType?.toLowerCase() === "package";
    const isPending = booking.status?.toLowerCase() === "requested";

    const allotments = Array.isArray(booking.allotments)
      ? booking.allotments
      : [];

    const performerChips = allotments.map((allotment) => {
      const name = escapeHTML(allotment.performerName || "Unknown performer");
      const role = escapeHTML(allotment.role || "");

      return `<span class="perf-chip">${name}${role ? ` · ${role}` : ""}</span>`;
    }).join("");

    const requestedPerformer = booking.requestedPerformer;
    const requestedName = typeof requestedPerformer === "string"
      ? requestedPerformer
      : requestedPerformer?.name || requestedPerformer?.fullName;

    let confirmationAction = "";

    if (isPending) {
      confirmationAction = `
        <button type="button" class="btn btn-confirm"
          data-act="confirm" data-id="${bookingId}"
          data-type="${isPackage ? "package" : "solo"}">✓ Confirm</button>

        <button type="button" class="btn btn-reject"
          data-act="reject" data-id="${bookingId}">✕ Reject</button>
      `;
    } else if (booking.reconfirmed) {
      confirmationAction = `<span class="tag-ok">✔ Reconfirmed</span>`;
    } else {
      confirmationAction = `
        <button type="button" class="btn btn-reconfirm"
          data-act="reconfirm" data-id="${bookingId}">↻ Mark Reconfirm</button>
      `;
    }

    return `
      <article class="bk">
        <div class="bk-top">
          <div>
            <div class="ref">${escapeHTML(booking.referenceId)}</div>
            <h3>${escapeHTML(booking.customerName)}</h3>
            <div class="meta">📞 ${escapeHTML(booking.phone || "N/A")}</div>
          </div>

          <div class="bk-top-tags">
            <span class="booking-type ${isPackage ? "package" : "solo"}">
              ${isPackage ? "PACKAGE" : "SOLO"}
            </span>
            <span class="time">🕒 ${escapeHTML(booking.eventTime || "N/A")}</span>
          </div>
        </div>

        <div class="booking-details">
          <div class="meta"><b>Event:</b> ${escapeHTML(booking.eventType || "N/A")}</div>

          ${!isPackage && isPending ? `
            <div class="meta">
              <b>Requested Performer:</b>
              ${escapeHTML(getRequestedPerformerName(booking))}
            </div>
          ` : ""}

          ${isPackage ? `
            <div class="meta"><b>Package:</b> ${escapeHTML(booking.packageName || "N/A")}</div>
          ` : ""}

          <div class="meta"><b>Date:</b> ${escapeHTML(booking.eventDate || "N/A")}</div>
          <div class="meta"><b>Address:</b> 📍 ${escapeHTML(booking.eventAddress || "N/A")}</div>

          <div class="meta">
            <b>Status:</b>
            <span class="status-text ${isPending ? "pending" : "confirmed"}">
              ${escapeHTML(booking.status || "N/A")}
            </span>
          </div>

          <div class="meta">
            <b>Final Amount:</b>
            ₹${Number(booking.finalAmount || 0).toLocaleString("en-IN")}
          </div>

          ${booking.additionalNote ? `
            <div class="booking-note">
              <b>Additional Note:</b> ${escapeHTML(booking.additionalNote)}
            </div>
          ` : ""}
        </div>

        <div class="perfs">
          <b class="performer-heading">Allotted Performers:</b>
          ${performerChips || '<span class="meta">No performers allotted</span>'}
        </div>

        <div class="actions">
          ${confirmationAction}

          <button type="button" class="btn btn-reallot"
            data-act="reallot" data-id="${bookingId}">Reallot</button>

          <button type="button" class="btn btn-cancel"
            data-act="cancel" data-id="${bookingId}">Cancel</button>
        </div>
      </article>
    `;
  };

  const renderList = (elementId, countId, bookings) => {
    const list = $(elementId);
    const items = Array.isArray(bookings) ? bookings : [];

    $(countId).textContent = items.length;

    list.innerHTML = items.length
      ? items.map(renderBooking).join("")
      : `<div class="empty"><span>🙏</span>No events scheduled</div>`;
  };

  // ---------- Confirmation ----------

  const finalAmountFields = () => `
    <div class="form-section">
      <label class="modal-check">
        <input type="checkbox" id="changeFinalAmount">
        Change the final amount?
      </label>

      <div id="finalAmountFields" class="conditional-fields" hidden>
        <label>Final amount (₹)</label>
        <input type="number" id="finalAmount" min="0" step="0.01">

        <label>Reason for changing the amount</label>
        <textarea id="amountReason" rows="2"></textarea>
      </div>
    </div>
  `;

  const ignoreConflictsField = () => `
    <div class="form-section">
      <label class="modal-check">
        <input type="checkbox" id="ignoreConflicts">
        Ignore Conflicts
      </label>
      <p class="field-help">
        If turned onn, it will ignore if the alloted performer has any previous
        booking on the same day, and will not block you to book him/her for this event
      </p>
    </div>
  `;

  const openConfirmModal = async (bookingId, type) => {
    activeBooking = { bookingId, type };
    currentAction = "confirm";

    const isPackage = type === "package";

    showModal(
      isPackage ? "Confirm Package Booking" : "Confirm Solo Booking",
      `<p>Loading performer details...</p>`,
      [{ label: "Close", action: "close" }]
    );

    try {
      const performers = await getPerformers();

      const allotmentRows = isPackage
        ? `
          <div class="form-section">
            <h3>Allot Performers</h3>
            <p class="field-help">Package allotments are compulsory.</p>
            <div id="confirmAllotments"></div>
            <button type="button" class="btn btn-add-row" id="addConfirmAllotment">
              + Add Performer
            </button>
          </div>
        `
        : `
          <div class="form-section">
            <label class="modal-check">
              <input type="checkbox" id="changePerformer">
              Allot another performer?
            </label>
            <div id="soloPerformerFields" class="conditional-fields" hidden>
              ${performerSelect(performers, "performer-select")}
              <label>Role (optional)</label>
              <input type="text" id="soloRole" placeholder="e.g. Lead Singer">
            </div>
          </div>
        `;

      showModal(
        isPackage ? "Confirm Package Booking" : "Confirm Solo Booking",
        `
          <form id="confirmForm">
            ${allotmentRows}
            ${finalAmountFields()}
            ${ignoreConflictsField()}
          </form>
        `,
        [
          { label: "Close", action: "close" },
          { label: "Confirm Booking", action: "submit-confirm", className: "btn-confirm" },
        ]
      );

      if (isPackage) {
        addConfirmAllotmentRow(performers);
      }

      $("changeFinalAmount").addEventListener("change", (event) => {
        $("finalAmountFields").hidden = !event.target.checked;
      });

      $("ignoreConflicts").checked = false;

      if (!isPackage) {
        $("changePerformer").addEventListener("change", (event) => {
          $("soloPerformerFields").hidden = !event.target.checked;
        });
      }

      if (isPackage) {
        $("addConfirmAllotment").addEventListener("click", () => {
          addConfirmAllotmentRow(performers);
        });
      }
    } catch (error) {
      showMessage("Unable to Load Performers", error.message, false, true);
    }
  };

  const addConfirmAllotmentRow = (performers) => {
    const container = $("confirmAllotments");
    if (!container) return;

    const row = document.createElement("div");
    row.className = "allotment-form-row";

    row.innerHTML = `
      <div class="allotment-fields">
        ${performerSelect(performers, "performer-select")}
        <input type="text" class="performer-role" placeholder="Role (optional)">
      </div>
      <button type="button" class="btn btn-remove-row">Remove</button>
    `;

    row.querySelector(".btn-remove-row").addEventListener("click", () => {
      row.remove();
    });

    container.appendChild(row);
  };

  const submitConfirmation = async () => {
    if (!activeBooking) return;

    const body = {};
    const isPackage = activeBooking.type === "package";

    const changeAmount = $("changeFinalAmount").checked;

    if (changeAmount) {
      const finalAmount = $("finalAmount").value;
      const reason = $("amountReason").value.trim();

      if (finalAmount === "" || Number(finalAmount) < 0 || !reason) {
        showToast("Enter a valid amount and reason.");
        return;
      }

      body.finalAmount = Number(finalAmount);
      body.reason = reason;
    }

    if (isPackage) {
      const rows = [...$("confirmAllotments").querySelectorAll(".allotment-form-row")];

      const allotments = rows.map((row) => {
        const performerId = row.querySelector(".performer-select").value;
        const role = row.querySelector(".performer-role").value.trim();

        return {
          performerId,
          ...(role ? { role } : {}),
        };
      });

      if (!allotments.length || allotments.some((item) => !item.performerId)) {
        showToast("Please select performers for all package allotments.");
        return;
      }

      body.allotments = allotments;
    } else if ($("changePerformer").checked) {
      const performerId = $("soloPerformerFields").querySelector("select").value;
      const role = $("soloRole").value.trim();

      if (!performerId) {
        showToast("Please select a performer.");
        return;
      }

      body.allotments = [{
        performerId,
        ...(role ? { role } : {}),
      }];
    }

    if ($("ignoreConflicts").checked) {
      body.ignoreConflicts = true;
    }

    try {
      modalFooter.innerHTML = `<span class="modal-loading">Confirming booking...</span>`;

      const result = await apiRequest(
        `/admin/actions/confirm/${encodeURIComponent(activeBooking.bookingId)}`,
        "POST",
        body
      );

      showMessage("Booking Confirmed", result.message || "Booking confirmed successfully.", true);
    } catch (error) {
      showMessage("Confirmation Failed", error.message, false, true);
    }
  };

  // ---------- Reject ----------

  const openRejectModal = (bookingId) => {
    activeBooking = { bookingId };
    currentAction = "reject";

    showModal(
      "Reject Booking",
      `<p>Are you sure you want to reject this booking?</p>`,
      [
        { label: "Go Back", action: "close" },
        { label: "Reject Booking", action: "submit-reject", className: "btn-cancel" },
      ],
      "⚠️"
    );
  };

  const submitReject = async () => {
    try {
      const result = await apiRequest(
        `/admin/actions/reject/${encodeURIComponent(activeBooking.bookingId)}`,
        "POST",
        {}
      );

      showMessage("Booking Rejected", result.message || "Booking rejected successfully.", true);
    } catch (error) {
      showMessage("Rejection Failed", error.message, false, true);
    }
  };

  // ---------- Cancel ----------

  const openCancelModal = (bookingId) => {
    activeBooking = { bookingId };
    currentAction = "cancel";

    showModal(
      "Cancel Booking",
      `
        <form id="cancelForm">
          <label>Cancelled by</label>
          <select id="cancelledBy" required>
            <option value="">Select</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
            <option value="performer">Performer</option>
          </select>

          <label>Reason</label>
          <textarea id="cancelReason" rows="3" required
            placeholder="Enter cancellation reason"></textarea>

          <p class="field-warning">⚠️ This action cannot be undone.</p>
        </form>
      `,
      [
        { label: "Go Back", action: "close" },
        { label: "Cancel Booking", action: "submit-cancel", className: "btn-cancel" },
      ],
      "⚠️"
    );
  };

  const submitCancel = async () => {
    const cancelledBy = $("cancelledBy").value;
    const reason = $("cancelReason").value.trim();

    if (!cancelledBy || !reason) {
      showToast("Please select who cancelled and enter a reason.");
      return;
    }

    try {
      const result = await apiRequest(
        `/admin/actions/cancel/${encodeURIComponent(activeBooking.bookingId)}`,
        "POST",
        { cancelledBy, reason }
      );

      showMessage("Booking Cancelled", result.message || "Booking cancelled successfully.", true);
    } catch (error) {
      showMessage("Cancellation Failed", error.message, false, true);
    }
  };

  // ---------- Reconfirm ----------

  const submitReconfirm = async (bookingId, button) => {
    button.disabled = true;

    try {
      const result = await apiRequest(
        `/api/admin/dashboard/markReconfirm/${encodeURIComponent(bookingId)}`,
        "POST",
        {}
      );

      button.outerHTML = `<span class="tag-ok">✔ Reconfirmed</span>`;
      showToast(result.message || "Booking marked as reconfirmed.");
    } catch (error) {
      button.disabled = false;
      showMessage("Reconfirmation Failed", error.message, false, true);
    }
  };

  // ---------- Reallot ----------

  const openReallotModal = async (bookingId) => {
    activeBooking = { bookingId };
    currentAction = "reallot";

    showModal(
      "Reallot Performers",
      `<p>Loading performers...</p>`,
      [{ label: "Close", action: "close" }]
    );

    try {
      const performers = await getPerformers();

      // Find the booking from the rendered card's data.
      const booking = window.dashboardBookings?.find(
        (item) => String(item.bookingId) === String(bookingId)
      );

      const allotments = booking?.allotments || [];

      if (!allotments.length) {
        showModal(
          "Reallot Performers",
          `<p>This booking has no existing allotments to reassign.</p>`,
          [{ label: "Close", action: "close" }]
        );
        return;
      }

      const rows = allotments.map((allotment, index) => {
        const oldName = escapeHTML(allotment.performerName || "Unknown performer");
        const oldId = escapeHTML(allotment.allotmentId || "");

        return `
          <div class="reallot-row" data-old-id="${oldId}">
            <div class="reallot-old">
              <b>Current performer</b>
              <span>${oldName}</span>
            </div>

            <div>
              <label>New performer</label>
              ${performerSelect(performers, "reallot-performer")}
            </div>

            <div>
              <label class="modal-check">
                <input type="checkbox" class="reallot-ignore">
                Ignore Conflicts
              </label>
              <p class="field-help">
                If turned onn, it will ignore if the alloted performer has any previous
                booking on the same day, and will not block you to book him/her for this event
              </p>
            </div>

            <div class="reallot-row-action">
              <button type="button" class="btn btn-reallot-row">Reallot</button>
            </div>
          </div>
        `;
      }).join("");

      showModal(
        "Reallot Performers",
        `
          <div class="reallot-list">${rows}</div>
          <p class="field-help">Click "All done" after completing the required reallotments.</p>
        `,
        [
          { label: "Close", action: "close" },
          { label: "All done", action: "reload", className: "modal-ok" },
        ]
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
              `/admin/actions/reallot/${encodeURIComponent(bookingId)}`,
              "POST",
              body
            );

            button.outerHTML = `<span class="tag-ok">✔ Reallotted</span>`;
            showToast(result.message || "Performer reallotted successfully.");
          } catch (error) {
            button.disabled = false;
            button.textContent = "Reallot";
            showMessage("Reallotment Failed", error.message, false, true);
          }
        });
      });
    } catch (error) {
      showMessage("Unable to Load Performers", error.message, false, true);
    }
  };

  // ---------- Modal actions ----------

  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeModal();
  });

  modalFooter.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-modal-action]");
    if (!button) return;

    const action = button.dataset.modalAction;

    if (action === "close") closeModal();
    if (action === "reload") window.location.reload();
    if (action === "submit-confirm") await submitConfirmation();
    if (action === "submit-reject") await submitReject();
    if (action === "submit-cancel") await submitCancel();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && modal.classList.contains("show")) {
      closeModal();
    }
  });

  // ---------- Dashboard action buttons ----------

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const { act, id, type } = button.dataset;

    if (act === "confirm") openConfirmModal(id, type);
    if (act === "reject") openRejectModal(id);
    if (act === "cancel") openCancelModal(id);
    if (act === "reallot") openReallotModal(id);
    if (act === "reconfirm") submitReconfirm(id, button);
  });

  // ---------- Load dashboard ----------

  const loadDashboard = async () => {
    try {
      const response = await fetch("/admin/dashboard/data", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      const result = await parseResponse(response);
      const data = result.data ?? result;
      const counts = data.counts ?? {};

      $("cTotal").textContent = counts.totalUpcoming ?? 0;
      $("cPending").textContent = counts.upcomingPending ?? 0;
      $("cUpcoming").textContent = counts.upcomingConfirmed ?? 0;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const toDateString = (date) => [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-");

      const todayString = toDateString(today);
      const tomorrowString = toDateString(tomorrow);

      $("todayDate").textContent = formatDate(todayString);
      $("todayDate2").textContent = formatDate(todayString);
      $("tomorrowDate").textContent = formatDate(tomorrowString);

      window.dashboardBookings = [
        ...(Array.isArray(data.today) ? data.today : []),
        ...(Array.isArray(data.tomorrow) ? data.tomorrow : []),
      ];

      renderList("todayList", "todayCount", data.today);
      renderList("tomorrowList", "tomorrowCount", data.tomorrow);
    } catch (error) {
      console.error("Dashboard loading failed:", error);

      $("todayList").innerHTML =
        `<div class="error-state">${escapeHTML(error.message || "Unable to load today's events.")}</div>`;

      $("tomorrowList").innerHTML =
        `<div class="error-state">Unable to load tomorrow's events.</div>`;

      showToast("Unable to load dashboard. Please try again.");
    }
  };

  loadDashboard();
})();