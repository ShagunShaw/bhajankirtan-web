
(() => {
  const $ = (id) => document.getElementById(id);

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
    setTimeout(() => toast.classList.remove("show"), 2500);
  };

  const showPackagePopup = () => {
    $("packageConfirmModal").classList.add("show");
  };

  const closePackagePopup = () => {
    $("packageConfirmModal").classList.remove("show");
  };

  $("packageConfirmOk").addEventListener("click", closePackagePopup);

  $("packageConfirmModal").addEventListener("click", (event) => {
    if (event.target.id === "packageConfirmModal") {
      closePackagePopup();
    }
  });

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

      return `
        <span class="perf-chip">
          ${name}${role ? ` · ${role}` : ""}
        </span>
      `;
    }).join("");

    let confirmationAction = "";

    if (isPending) {
      confirmationAction = `
        <button type="button" class="btn btn-confirm"
          data-act="confirm"
          data-id="${bookingId}"
          data-type="${isPackage ? "package" : "solo"}">
          ✓ Confirm
        </button>
      `;
    } else if (booking.reconfirmed) {
      confirmationAction = `
        <span class="tag-ok">✔ Reconfirmed</span>
      `;
    } else {
      confirmationAction = `
        <button type="button" class="btn btn-reconfirm"
          data-act="reconfirm" data-id="${bookingId}">
          ↻ Reconfirm
        </button>
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

          ${isPackage ? `
            <div class="meta">
              <b>Package:</b> ${escapeHTML(booking.packageName || "N/A")}
            </div>
          ` : ""}

          <div class="meta">
            <b>Date:</b> ${escapeHTML(booking.eventDate || "N/A")}
          </div>

          <div class="meta">
            <b>Address:</b> 📍 ${escapeHTML(booking.eventAddress || "N/A")}
          </div>

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
              <b>Additional Note:</b>
              ${escapeHTML(booking.additionalNote)}
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
            data-act="reallot" data-id="${bookingId}">
            Reallot
          </button>

          <button type="button" class="btn btn-cancel"
            data-act="cancel" data-id="${bookingId}">
            Cancel
          </button>
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

  // Temporary action handling. Backend routes will be connected later.
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-act]");
    if (!button) return;

    const action = button.dataset.act;

    if (action === "confirm") {
      if (button.dataset.type === "package") {
        showPackagePopup();
      } else {
        showToast("Solo confirmation route will be connected next.");
      }
    }

    if (action === "reconfirm") {
      showToast("Reconfirmation route will be connected next.");
    }

    if (action === "reallot") {
      showToast("Reallotment route will be connected next.");
    }

    if (action === "cancel") {
      showToast("Cancellation route will be connected next.");
    }
  });

  const loadDashboard = async () => {
    try {
      const response = await fetch("/admin/dashboard/data", {
        method: "GET",
        credentials: "same-origin",
        headers: { Accept: "application/json" },
      });

      if (response.status === 401 || response.status === 403) {
        window.location.replace("/admin/login");
        return;
      }

      const result = await response.json();

      if (!response.ok || result.success === false) {
        throw new Error(
          result.message || result.errMessage || "Failed to load dashboard data."
        );
      }

      const data = result.data ?? result;
      const counts = data.counts ?? {};

      $("cTotal").textContent = counts.totalUpcoming ?? 0;
      $("cPending").textContent = counts.upcomingPending ?? 0;
      $("cUpcoming").textContent = counts.upcomingConfirmed ?? 0;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const todayString = [
        today.getFullYear(),
        String(today.getMonth() + 1).padStart(2, "0"),
        String(today.getDate()).padStart(2, "0"),
      ].join("-");

      const tomorrowString = [
        tomorrow.getFullYear(),
        String(tomorrow.getMonth() + 1).padStart(2, "0"),
        String(tomorrow.getDate()).padStart(2, "0"),
      ].join("-");

      $("todayDate").textContent = formatDate(todayString);
      $("todayDate2").textContent = formatDate(todayString);
      $("tomorrowDate").textContent = formatDate(tomorrowString);

      renderList("todayList", "todayCount", data.today);
      renderList("tomorrowList", "tomorrowCount", data.tomorrow);
    } catch (error) {
      console.error("Dashboard loading failed:", error);

      $("todayList").innerHTML =
        '<div class="error-state">Unable to load today’s events.</div>';

      $("tomorrowList").innerHTML =
        '<div class="error-state">Unable to load tomorrow’s events.</div>';

      showToast("Unable to load dashboard. Please try again.");
    }
  };

  loadDashboard();
})();
