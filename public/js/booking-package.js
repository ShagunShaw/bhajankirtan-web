
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("packageBookingForm");
  if (!form) return;

  const packageId = form.dataset.packageId;

  const submitButton = document.getElementById("submitPackageBooking");
  const loader = document.getElementById("packageBookingLoader");
  const modal = document.getElementById("packageBookingModal");
  const modalTitle = document.getElementById("packageModalTitle");
  const responseContent = document.getElementById(
    "packageBookingResponseContent"
  );

  const referenceSection = document.getElementById("packageReferenceSection");
  const referenceIdElement = document.getElementById("packageReferenceId");
  const copyButton = document.getElementById("copyPackageReference");
  const copyMessage = document.getElementById("packageCopyMessage");

  const closeButton = document.getElementById("closePackageBookingModal");
  const homeButton = document.getElementById("packageBackToHome");

  const MINIMUM_LOADING_TIME = 5000;

  const delay = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms));

  function showLoader() {
    loader.hidden = false;
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";
  }

  function hideLoader() {
    loader.hidden = true;
    submitButton.disabled = false;
    submitButton.textContent = "Submit Booking Request";
  }

  function showModal(result, httpOk) {
    const data = result?.data || {};
    const success = httpOk && result?.success === true;

    modalTitle.textContent = success
      ? "Package Booking Submitted"
      : "Package Booking Response";

    // Reference ID is shown at the top of the popup.
    referenceSection.hidden = !(success && data.referenceId);

    if (success && data.referenceId) {
      referenceIdElement.textContent = data.referenceId;
    }

    copyMessage.textContent = "";

    responseContent.replaceChildren();

    const message = document.createElement("p");
    message.textContent =
      data.message ||
      result?.message ||
      (success
        ? "Your package booking request has been submitted."
        : "We could not complete your booking request. Please try again.");

    responseContent.appendChild(message);

    if (success) {
      const details = [
        ["Booking Status", data.status],
        ["Customer Name", data.customerName],
        ["Package Name", data.packageName],
        ["Event Date", data.eventDate],
        ["Event Time", data.eventTime],
        [
          "Quoted Amount",
          data.quotedAmount != null ? `₹${data.quotedAmount}` : null,
        ],
      ];

      const container = document.createElement("div");
      container.className = "package-response-details";

      details.forEach(([label, value]) => {
        if (value == null || value === "") return;

        const row = document.createElement("p");
        const labelElement = document.createElement("strong");

        labelElement.textContent = `${label}: `;
        row.append(labelElement, document.createTextNode(String(value)));
        container.appendChild(row);
      });

      responseContent.appendChild(container);
    }

    modal.hidden = false;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) return;

    const startTime = Date.now();
    const formData = new FormData(form);
    const payload = Object.fromEntries(formData.entries());

    if (payload.expectedGuests) {
      payload.expectedGuests = Number(payload.expectedGuests);
    } else {
      delete payload.expectedGuests;
    }

    showLoader();

    let result;
    let httpOk = false;

    try {
      const response = await fetch(
        `/api/default/book/package/${encodeURIComponent(packageId)}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      httpOk = response.ok;

      try {
        result = await response.json();
      } catch {
        result = {
          success: false,
          message: "The server returned an invalid response. Please try again.",
        };
      }
    } catch {
      result = {
        success: false,
        message:
          "Unable to connect to the server. Please check your internet connection and try again.",
      };
    }

    const elapsed = Date.now() - startTime;
    await delay(Math.max(0, MINIMUM_LOADING_TIME - elapsed));

    hideLoader();
    showModal(result, httpOk);
  });

  copyButton.addEventListener("click", async () => {
    const value = referenceIdElement.textContent.trim();
    if (!value) return;

    try {
      await navigator.clipboard.writeText(value);
      copyMessage.textContent = "Reference ID copied!";
    } catch {
      const temporaryInput = document.createElement("textarea");
      temporaryInput.value = value;
      temporaryInput.style.position = "fixed";
      temporaryInput.style.opacity = "0";

      document.body.appendChild(temporaryInput);
      temporaryInput.select();

      const copied = document.execCommand("copy");
      temporaryInput.remove();

      copyMessage.textContent = copied
        ? "Reference ID copied!"
        : `Please copy your reference ID manually: ${value}`;
    }
  });

  function closeModal() {
    modal.hidden = true;
  }

  closeButton.addEventListener("click", closeModal);

  modal.addEventListener("click", (event) => {
    if (event.target.classList.contains("booking-modal-backdrop")) {
      closeModal();
    }
  });

  homeButton.addEventListener("click", () => {
    window.location.href = "/";
  });

  // Prevent choosing a date in the past.
  const eventDateInput = document.getElementById("packageEventDate");

  if (eventDateInput) {
    const today = new Date();
    eventDateInput.min = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, "0"),
      String(today.getDate()).padStart(2, "0"),
    ].join("-");
  }
});
