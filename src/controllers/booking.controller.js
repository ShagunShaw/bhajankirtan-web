import { updateFinalAmount, getAllBookingsService, confirmBookingService, rejectBookingService, reAllotBookingService, cancelBookingService } from "../services/booking.service.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";

export const editFinalAmount = async (req, res) => {
    try {
        const { finalAmount, reason } = req.body;       // 'reason' is optional here
        const { bookingId } = req.params

        const updated = await updateFinalAmount(bookingId, finalAmount, reason);

        return res.status(200)
            .json(new apiResponse(200, updated, `Final Amount for the booking id ${bookingId} has been updated successfully!`))
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};

export const getAllBookings = async (req, res) => {
    try {
        const data = await getAllBookingsService(req.query); // { bookings, page, limit, total }
        return res.status(200).json(new apiResponse(200, data, "Bookings fetched successfully"));
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};

export const confirmBooking = async (req, res) => {
    try {
        const booking = await confirmBookingService(req.params.bookingId, req.body);
        res.status(200).json(new apiResponse(200, booking, "Booking confirmed successfully"));
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};

export const rejectBooking = async (req, res) => {
    try {
        const booking = await rejectBookingService(req.params.bookingId, req.body?.reason);
        res.status(200).json(new apiResponse(200, booking, "Booking rejected successfully"));
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};

export const reAllotBooking = async (req, res) => {
    try {
        const booking = await reAllotBookingService(req.params.bookingId, req.body);
        res.status(200).json(new apiResponse(200, booking, "Performer reallotted successfully"));
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};

export const cancelBooking = async (req, res) => {
    try {
        const booking = await cancelBookingService(req.params.bookingId, req.body);
        res.status(200).json(new apiResponse(200, booking, "Booking cancelled successfully"));
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
};