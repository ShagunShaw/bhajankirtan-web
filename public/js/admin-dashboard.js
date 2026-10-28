(() => {
  const $ = (id) => document.getElementById(id);

  const escapeHTML = (value = "") =>
    String(value).replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    })[char]);

  const formatDate = (date) =>
    date.toLocaleDateString("en-IN", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const showToast = (message) => {
    const toast = $("toast");
    toast.textContent = message;
    toast.classList.add("show");

    setTimeout(() => toast.classList.remove("show"), 2500);
  };

  const renderBooking = (booking, isToday) => {
    const referenceId = escapeHTML(booking.referenceId);
    const customerName = escapeHTML(booking.customerName);
    const eventType = escapeHTML(booking.eventType);
    const eventTime = escapeHTML(booking.eventTime);
    const eventAddress = escapeHTML(booking.eventAddress);
    const bookingId = escapeHTML(booking.bookingId);

    const allotments = Array.isArray(booking.allotments)
      ? booking.allotments
      : [];

    const performerChips = allotments.map((allotment) => {
      const name = escapeHTML(allotment.performerName);
      const role = escapeHTML(allotment.role);

      return `<span class="perf-chip">${name}${role ? ` · ${role}` : ""}</span>`;
    }).join("");

    const reconfirmAction =
      isToday && booking.reconfirmed
        ? `<span class="tag-ok">✔ Reconfirmed</span>`
        : `<button type="button" class="btn btn-reconfirm"
             data-act="reconfirm" data-id="${bookingId}">
             Mark Reconfirm
           </button>`;

    return `
      <article class="bk">
        <div class="bk-top">
          <div>
            <div class="ref">${referenceId}</div>
            <h3>${customerName}</h3>
          </div>
          <span class="time">🕒 ${eventTime}</span>
        </div>

        <div class="meta"><b>${eventType}</b></div>
        <div class="meta">📍 ${eventAddress}</div>

        <div class="perfs">
          ${performerChips || '<span class="meta">No performers allotted</span>'}
        </div>

        <div class="actions">
          ${reconfirmAction}
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

  const renderList = (elementId, countId, bookings, isToday) => {
    const list = $(elementId);
    const items = Array.isArray(bookings) ? bookings : [];

    $(countId).textContent = items.length;

    list.innerHTML = items.length
      ? items.map((booking) => renderBooking(booking, isToday)).join("")
      : `<div class="empty"><span>🙏</span>No events scheduled</div>`;
  };

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
        throw new Error(result.message || result.errMessage ||
          "Failed to load dashboard data.");
      }

      // Supports both a direct payload and a standard { data: ... } response.
      const data = result.data ?? result;
      const counts = data.counts ?? {};

      $("cTotal").textContent = counts.total ?? 0;
      $("cPending").textContent = counts.pending ?? 0;
      $("cUpcoming").textContent = counts.upcomingConfirmed ?? 0;

      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      $("todayDate").textContent = formatDate(today);
      $("todayDate2").textContent = formatDate(today);
      $("tomorrowDate").textContent = formatDate(tomorrow);

      renderList("todayList", "todayCount", data.today, true);
      renderList("tomorrowList", "tomorrowCount", data.tomorrow, false);
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