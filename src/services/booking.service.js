import mongoose from "mongoose";
import { apiError } from '../utils/apiError.js';
import { Booking } from "../models/booking.model.js";

export const updateFinalAmount = async (bookingId, amount, reason) => {
    try {
        if (!mongoose.isValidObjectId(bookingId)) throw new apiError(400, "Invalid booking id", "The provided booking ID is invalid");

        const value = Number(amount);
        if (amount == null || String(amount).trim() === "" || !Number.isFinite(value) || value < 0) {
            throw new apiError(400, "Invalid amount", "Enter a valid amount to update the price");
        }

        const cleanReason = typeof reason === "string" ? reason.trim().slice(0, 200) : "";
        const update = cleanReason
            ? { $set: { finalAmount: value, priceChangeReason: cleanReason } }
            : { $set: { finalAmount: value }, $unset: { priceChangeReason: "" } };

        // Only a pending booking can change price. Once confirmed, the amount is frozen.
        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, status: "requested" },
            update,
            { new: true, runValidators: true }
        ).select("_id referenceId quotedAmount finalAmount priceChangeReason status");

        if (!updated) {
            throw new apiError(409, "Cannot Update Amount", "Amount can be changed only while the booking is still pending");
        }
        return updated;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}