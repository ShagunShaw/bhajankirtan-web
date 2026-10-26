import mongoose from "mongoose";
import { apiError } from '../utils/apiError.js';
import { Booking } from "../models/booking.model.js";
import { istDate } from "../utils/dates.js";


const STATUSES = ["requested", "confirmed", "rejected", "cancelled", "completed"];
const CANCELLED_BY = ["customer", "admin", "performer"];
const MAX_ALLOTMENTS = 15;
const POPULATE = [
    { path: "requestedPerformer", select: "fullName" },
    { path: "package", select: "packageName" },
    { path: "allotments.performer", select: "fullName" }
];

/* ---------- helpers ---------- */
const assertId = (id, label = "ID") => {
    if (!mongoose.isValidObjectId(id)) throw new apiError(400, "Invalid ID", `The provided ${label} is invalid`);
};

const cleanText = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");

const parseAmount = (amount) => {
    const value = Number(amount);
    if (amount == null || String(amount).trim() === "" || !Number.isFinite(value) || value < 0) {
        throw new apiError(400, "Validation Error", "Enter a valid amount");
    }
    return value;
};

const explainFailure = async (bookingId, stateMessage) => {
    const exists = await Booking.exists({ _id: bookingId });
    return exists
        ? new apiError(409, "Invalid State", stateMessage)
        : new apiError(404, "Booking Not Found", "Booking does not exist");
};

const parseAllotments = (input) => {
    if (!Array.isArray(input) || input.length === 0) {
        throw new apiError(400, "Validation Error", "Select at least one performer");
    }
    if (input.length > MAX_ALLOTMENTS) {
        throw new apiError(400, "Validation Error", `At most ${MAX_ALLOTMENTS} performers can be allotted`);
    }
    const seen = new Set();
    return input.map((item) => {
        const performerId = typeof item === "string" ? item : item?.performerId;
        assertId(performerId, "performer ID");
        if (seen.has(String(performerId))) {
            throw new apiError(400, "Validation Error", "The same performer was selected twice");
        }
        seen.add(String(performerId));
        return { performer: performerId, role: cleanText(item?.role, 60) || undefined, status: "assigned" };
    });
};

const assertPerformersExist = async (ids) => {
    const count = await Performer.countDocuments({ _id: { $in: ids } });
    if (count !== ids.length) throw new apiError(404, "Performer Not Found", "One or more performers do not exist");
};

// Same-date check against OTHER confirmed bookings. Admin can override with ignoreConflicts.
const assertNoConflicts = async (performerIds, eventDate, excludeBookingId, ignoreConflicts) => {
    if (ignoreConflicts === true || ignoreConflicts === "true") return;

    const rows = await Booking.find({
        _id: { $ne: excludeBookingId },
        status: "confirmed",
        eventDate,
        allotments: { $elemMatch: { performer: { $in: performerIds }, status: "assigned" } }
    })
        .select("referenceId eventTime allotments")
        .lean();

    const wanted = new Set(performerIds.map(String));
    const conflicts = [];
    for (const b of rows) {
        for (const a of b.allotments) {
            if (a.status === "assigned" && wanted.has(String(a.performer))) {
                conflicts.push({ performerId: String(a.performer), referenceId: b.referenceId, eventTime: b.eventTime });
            }
        }
    }
    if (!conflicts.length) return;

    const people = await Performer.find({ _id: { $in: conflicts.map((c) => c.performerId) } })
        .select("fullName")
        .lean();
    const nameOf = new Map(people.map((p) => [String(p._id), p.fullName]));
    const text = conflicts
        .map((c) => `${nameOf.get(c.performerId) || "A performer"} is already booked for ${c.referenceId} at ${c.eventTime}`)
        .join("; ");
    throw new apiError(409, "Booking Conflict", `${text} on ${eventDate}. Send ignoreConflicts: true to allot anyway.`);
};

const toAdminBooking = (b) => ({
    bookingId: b._id,
    referenceId: b.referenceId,
    status: b.status,
    bookingType: b.bookingType,
    customer: { name: b.customerName, phone: b.phone, email: b.email },
    requestedPerformer: b.requestedPerformer
        ? { id: b.requestedPerformer._id, name: b.requestedPerformer.fullName }
        : null,
    packageName: b.package?.packageName || b.packageName || null,
    eventType: b.eventType,
    eventDate: b.eventDate,
    eventTime: b.eventTime,
    eventAddress: b.eventAddress,
    expectedGuests: b.expectedGuests,
    additionalNote: b.additionalNote,
    quotedAmount: b.quotedAmount,
    finalAmount: b.finalAmount,
    priceChangeReason: b.priceChangeReason,
    markedReconfirmed: b.markedReconfirmed,
    allotments: (b.allotments || []).map((a) => ({
        allotmentId: a._id,
        performerId: a.performer?._id,
        performerName: a.performer?.fullName,
        role: a.role,
        status: a.status,
        cancelReason: a.cancelReason
    })),
    cancelledBy: b.cancelledBy,
    cancelledAt: b.cancelledAt,
    cancelReason: b.cancelReason,
    createdAt: b.createdAt
});

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

export const getAllBookingsService = async ({ status, page = 1, limit = 50 } = {}) => {
    try {
        if (status && !STATUSES.includes(status)) {
            throw new apiError(400, "Validation Error", `Status must be one of: ${STATUSES.join(", ")}`);
        }
        const pageNum = Math.max(parseInt(page, 10) || 1, 1);
        const limitNum = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 100);
        const filter = status ? { status } : {};
        const today = istDate(0);

        const [rows, total] = await Promise.all([
            Booking.aggregate([
                { $match: filter },
                {
                    $addFields: {
                        statusRank: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ["$status", "requested"] }, then: 0 },
                                    { case: { $and: [{ $eq: ["$status", "confirmed"] }, { $gte: ["$eventDate", today] }] }, then: 1 },
                                    { case: { $eq: ["$status", "confirmed"] }, then: 2 }
                                ],
                                default: 3
                            }
                        }
                    }
                },
                { $sort: { statusRank: 1, eventDate: 1, eventTime: 1 } },
                { $skip: (pageNum - 1) * limitNum },
                { $limit: limitNum }
            ]),
            Booking.countDocuments(filter)
        ]);

        const populated = await Booking.populate(rows, POPULATE);
        return { bookings: populated.map(toAdminBooking), page: pageNum, limit: limitNum, total };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const confirmBookingService = async (bookingId, body = {}) => {
    try {
        assertId(bookingId, "booking ID");
        const { allotments, finalAmount, reason, ignoreConflicts } = body;

        const booking = await Booking.findById(bookingId);
        if (!booking) throw new apiError(404, "Booking Not Found", "Booking does not exist");
        if (booking.status !== "requested") {
            throw new apiError(409, "Invalid State", "Only pending bookings can be confirmed");
        }
        if (booking.eventDate < istDate(0)) {
            throw new apiError(409, "Invalid State", "The event date has already passed");
        }

        // Solo booking with nothing selected: allot the performer the customer asked for
        let input = allotments;
        const nothingSelected = input == null || (Array.isArray(input) && input.length === 0);
        if (nothingSelected && booking.bookingType === "solo" && booking.requestedPerformer) {
            input = [{ performerId: booking.requestedPerformer }];
        }

        const newAllotments = parseAllotments(input);
        const ids = newAllotments.map((a) => a.performer);
        await assertPerformersExist(ids);
        await assertNoConflicts(ids, booking.eventDate, booking._id, ignoreConflicts);

        // Optional price change: allowed only now, before the booking is confirmed
        if (finalAmount !== undefined && finalAmount !== null && String(finalAmount).trim() !== "") {
            booking.finalAmount = parseAmount(finalAmount);
            booking.priceChangeReason = cleanText(reason) || undefined;
        }

        booking.allotments = newAllotments;
        booking.status = "confirmed";
        booking.markedReconfirmed = false;
        await booking.save();

        await booking.populate(POPULATE);
        return toAdminBooking(booking.toObject());
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const rejectBookingService = async (bookingId, reason) => {
    try {
        assertId(bookingId, "booking ID");

        const set = { status: "rejected" };
        const cleanReason = cleanText(reason);
        if (cleanReason) set.cancelReason = cleanReason;

        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, status: "requested" },
            { $set: set },
            { new: true }
        ).populate(POPULATE);

        if (!updated) throw await explainFailure(bookingId, "Only pending bookings can be rejected");
        return toAdminBooking(updated.toObject());
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const reAllotBookingService = async (bookingId, body = {}) => {
    try {
        assertId(bookingId, "booking ID");
        const { oldAllotmentId, newPerformerId, role, reason, ignoreConflicts } = body;
        assertId(oldAllotmentId, "allotment ID");
        assertId(newPerformerId, "performer ID");

        const booking = await Booking.findById(bookingId);
        if (!booking) throw new apiError(404, "Booking Not Found", "Booking does not exist");
        if (booking.status !== "confirmed") {
            throw new apiError(409, "Invalid State", "Only confirmed bookings can be reallotted");
        }
        if (booking.eventDate < istDate(0)) {
            throw new apiError(409, "Invalid State", "The event date has already passed");
        }

        const old = booking.allotments.id(oldAllotmentId);
        if (!old || old.status !== "assigned") {
            throw new apiError(409, "Invalid State", "That performer is not currently assigned to this booking");
        }
        if (String(old.performer) === String(newPerformerId)) {
            throw new apiError(400, "Validation Error", "Choose a different performer");
        }
        const alreadyAssigned = booking.allotments.some(
            (a) => a.status === "assigned" && String(a.performer) === String(newPerformerId)
        );
        if (alreadyAssigned) throw new apiError(409, "Invalid State", "That performer is already assigned to this booking");

        await assertPerformersExist([newPerformerId]);
        await assertNoConflicts([newPerformerId], booking.eventDate, booking._id, ignoreConflicts);

        old.status = "cancelled";
        old.cancelledAt = new Date();
        old.cancelReason = cleanText(reason) || "Performer replaced";

        booking.allotments.push({
            performer: newPerformerId,
            role: cleanText(role, 60) || old.role,
            status: "assigned"
        });
        booking.markedReconfirmed = false; // the new performer has not been called yet
        await booking.save();

        await booking.populate(POPULATE);
        return toAdminBooking(booking.toObject());
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

// Cancel a pending or confirmed upcoming booking and record WHO cancelled it.
export const cancelBookingService = async (bookingId, { cancelledBy, reason } = {}) => {
    try {
        assertId(bookingId, "booking ID");
        if (!CANCELLED_BY.includes(cancelledBy)) {
            throw new apiError(400, "Validation Error", `cancelledBy must be one of: ${CANCELLED_BY.join(", ")}`);
        }

        const now = new Date();
        const set = {
            status: "cancelled",
            cancelledBy,
            cancelledAt: now,
            "allotments.$[a].status": "cancelled",
            "allotments.$[a].cancelledAt": now,
            "allotments.$[a].cancelReason": "Booking cancelled"
        };
        const cleanReason = cleanText(reason);
        if (cleanReason) set.cancelReason = cleanReason;

        const updated = await Booking.findOneAndUpdate(
            { _id: bookingId, status: { $in: ["requested", "confirmed"] }, eventDate: { $gte: istDate(0) } },
            { $set: set },
            { new: true, arrayFilters: [{ "a.status": "assigned" }] }
        ).populate(POPULATE);

        if (!updated) {
            throw await explainFailure(bookingId, "Only pending or confirmed upcoming bookings can be cancelled");
        }
        return toAdminBooking(updated.toObject());
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};