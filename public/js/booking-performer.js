
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("performerBookingForm");

    if (!form) return;

    const performerId = form.dataset.performerId;
    const submitButton = document.getElementById("submitBooking");
    const bookingLoader = document.getElementById("bookingLoader");
    const bookingModal = document.getElementById("bookingModal");
    const bookingResponseContent = document.getElementById(
        "bookingResponseContent"
    );
    const referenceSection = document.getElementById("referenceSection");
    const referenceId = document.getElementById("referenceId");
    const copyReferenceButton = document.getElementById("copyReferenceId");
    const copyMessage = document.getElementById("copyMessage");
    const bookingError = document.getElementById("bookingError");
    const closeModalButton = document.getElementById("closeBookingModal");
    const homeButton = document.getElementById("doneBookingModal");

    const MINIMUM_LOADING_TIME = 5000;

    const delay = (ms) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    function showLoader() {
        bookingLoader.hidden = false;
        submitButton.disabled = true;
        bookingError.hidden = true;
    }

    function hideLoader() {
        bookingLoader.hidden = true;
        submitButton.disabled = false;
    }


    function showModal(result, httpOk) {
        const data = result?.data || {};
        const success = httpOk && result?.success === true;

        document.getElementById("bookingModalTitle").textContent = success
            ? "Booking Request Submitted"
            : "Booking Request Response";

        if (success) {
            bookingResponseContent.replaceChildren();

            // Show reference ID first
            if (data.referenceId) {
                referenceId.textContent = data.referenceId;
                referenceSection.hidden = false;
            } else {
                referenceSection.hidden = true;
            }

            // Booking success message
            const message = document.createElement("p");
            message.textContent =
                data.message || result.message || "Booking request submitted successfully.";

            bookingResponseContent.appendChild(message);

            // Other booking details
            const details = [
                ["Booking Status", data.status],
                ["Customer Name", data.customerName],
                ["Performer", data.performerName],
                ["Event Date", data.eventDate],
                ["Event Time", data.eventTime],
                ["Quoted Amount", data.quotedAmount != null ? `₹${data.quotedAmount}` : null],
            ];

            const detailsContainer = document.createElement("div");
            detailsContainer.className = "booking-response-details";

            details.forEach(([label, value]) => {
                if (value == null || value === "") return;

                const row = document.createElement("p");
                const labelElement = document.createElement("strong");

                labelElement.textContent = `${label}: `;
                row.append(labelElement, document.createTextNode(String(value)));
                detailsContainer.appendChild(row);
            });

            bookingResponseContent.appendChild(detailsContainer);
        } else {
            referenceSection.hidden = true;
            bookingResponseContent.textContent =
                data.message ||
                result?.message ||
                "We could not complete your booking request. Please try again.";
        }

        referenceSection.hidden = !(success && data.referenceId);

        if (success && data.referenceId) {
            referenceId.textContent = data.referenceId;
        }

        copyMessage.textContent = "";
        bookingModal.hidden = false;
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
                `/book/performer/${encodeURIComponent(performerId)}`,
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
                    message: "The server returned an invalid response.",
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
        const remaining = Math.max(0, MINIMUM_LOADING_TIME - elapsed);

        await delay(remaining);

        hideLoader();
        showModal(result, httpOk);
    });

    copyReferenceButton.addEventListener("click", async () => {
        const value = referenceId.textContent.trim();
        if (!value) return;

        try {
            await navigator.clipboard.writeText(value);
            copyMessage.textContent = "Reference ID copied!";
        } catch {
            copyMessage.textContent =
                "Please copy your reference ID manually: " + value;
        }
    });

    function closeModal() {
        bookingModal.hidden = true;
    }

    closeModalButton.addEventListener("click", closeModal);

    bookingModal.addEventListener("click", (event) => {
        if (
            event.target.classList.contains("booking-modal-backdrop")
        ) {
            closeModal();
        }
    });

    homeButton.addEventListener("click", () => {
        window.location.href = "/";
    });

    // Prevent selecting a past event date.
    const eventDateInput = document.getElementById("eventDate");

    if (eventDateInput) {
        const today = new Date();
        const localToday = [
            today.getFullYear(),
            String(today.getMonth() + 1).padStart(2, "0"),
            String(today.getDate()).padStart(2, "0"),
        ].join("-");

        eventDateInput.min = localToday;
    }
});
