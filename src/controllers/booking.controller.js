import { updateFinalAmount } from "../services/booking.service.js";
import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";

export const editFinalAmount = async (req, res, next) => {
    try {
        const { finalAmount, reason } = req.body;       // 'reason' is optional here
        const { bookingId } = req.params

        const updated= await updateFinalAmount(bookingId, finalAmount, reason);

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