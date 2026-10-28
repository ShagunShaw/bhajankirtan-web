
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("bookingStatusForm");
    if (!form) return;

    const submitButton = document.getElementById("checkBookingStatus");
    const loader = document.getElementById("statusLoader");
    const modal = document.getElementById("statusModal");
    const modalTitle = document.getElementById("statusModalTitle");
    const summary = document.getElementById("statusSummary");
    const errorMessage = document.getElementById("statusFormError");

    const closeButton = document.getElementById("closeStatusModal");
    const homeButton = document.getElementById("statusBackHome");

    function showLoader() {
        loader.hidden = false;
        submitButton.disabled = true;
        submitButton.textContent = "Checking...";
        errorMessage.hidden = true;
    }

    function hideLoader() {
        loader.hidden = true;
        submitButton.disabled = false;
        submitButton.textContent = "Send";
    }

    function addDetail(container, label, value) {
        if (value === null || value === undefined || value === "") return;

        const row = document.createElement("p");
        const labelElement = document.createElement("strong");

        labelElement.textContent = `${label}: `;
        row.append(labelElement, document.createTextNode(String(value)));
        container.appendChild(row);
    }

    function showResponse(result) {
        summary.replaceChildren();

        const success = result?.success === true;
        const data = result?.data;

        modalTitle.textContent = success
            ? "Booking Details"
            : result?.errName || "Unable to Find Booking";

        const message = document.createElement("p");
        message.textContent =
            result?.message ||
            result?.errMessage ||
            "An unexpected error occurred. Please try again.";

        summary.appendChild(message);

        if (success && data) {
            const card = document.createElement("div");
            card.className = "status-result-card";

            // Reference ID at the top
            if (data.referenceId) {
                const reference = document.createElement("p");
                reference.className = "status-reference";
                reference.textContent = data.referenceId;
                card.appendChild(reference);
            }

            addDetail(card, "Booking Status", data.status);
            addDetail(
                card,
                "Booking Type",
                data.packageName ? "Package" : data.bookingType === "solo"
                    ? "Performer"
                    : data.bookingType
            );
            addDetail(card, "Customer Name", data.customerName);

            if (data.requestedPerformer?.name) {
                addDetail(card, "Performer", data.requestedPerformer.name);
            }

            if (data.packageName) {
                addDetail(card, "Package", data.packageName);
            }

            addDetail(card, "Event Type", data.eventType);
            addDetail(card, "Event Date", data.eventDate);
            addDetail(card, "Event Time", data.eventTime);
            addDetail(card, "Event Address", data.eventAddress);
            addDetail(card, "Expected Guests", data.expectedGuests);
            addDetail(card, "Quoted Amount", data.quotedAmount != null ? `₹${data.quotedAmount}` : null);
            addDetail(card, "Final Amount", data.finalAmount != null ? `₹${data.finalAmount}` : null);
            addDetail(card, "Price Change Reason", data.priceChangeReason);
            addDetail(card, "Performers Reconfirmed", data.performersReconfirmed);
            addDetail(card, "Closed Reason", data.closedReason);
            addDetail(card, "Cancelled By", data.cancelledBy);
            addDetail(card, "Cancelled At", data.cancelledAt);
            addDetail(card, "Booking Created", data.createdAt);

            if (data.additionalNote) {
                addDetail(card, "Additional Notes", data.additionalNote);
            }

            if (Array.isArray(data.performers) && data.performers.length > 0) {
                const heading = document.createElement("p");
                const strong = document.createElement("strong");
                strong.textContent = "Assigned Performers";
                heading.appendChild(strong);
                card.appendChild(heading);

                data.performers.forEach((performer, index) => {
                    addDetail(
                        card,
                        `Performer ${index + 1}`,
                        performer.name || performer.fullName || "Name unavailable"
                    );
                });
            }

            summary.appendChild(card);
        }

        modal.hidden = false;
    }

    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const payload = {
            refId: String(formData.get("refId") || "").trim(),
            phone: String(formData.get("phone") || "").trim(),
        };

        if (!payload.refId || !payload.phone) return;

        const requestStartTime = Date.now();
        showLoader();

        let result;

        try {
            const response = await fetch("/booking-status/check", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            try {
                result = await response.json();
            } catch {
                result = {
                    success: false,
                    errName: "Unexpected Response",
                    errMessage: "The server returned an unreadable response.",
                };
            }
        } catch {
            result = {
                success: false,
                errName: "Connection Error",
                errMessage:
                    "Unable to connect to the server. Check your internet connection and try again.",
            };
        }

        const elapsed = Date.now() - requestStartTime;
        const remainingTime = Math.max(0, 5000 - elapsed);

        await new Promise((resolve) => setTimeout(resolve, remainingTime));

        hideLoader();
        showResponse(result);
    });

    closeButton.addEventListener("click", () => {
        modal.hidden = true;
    });

    modal.addEventListener("click", (event) => {
        if (event.target.classList.contains("booking-modal-backdrop")) {
            modal.hidden = true;
        }
    });

    homeButton.addEventListener("click", () => {
        window.location.href = "/";
    });
});
