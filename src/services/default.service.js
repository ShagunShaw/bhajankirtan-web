import mongoose from "mongoose";
import { Performer } from "../models/performer.model.js";
import { PeakPrice } from "../models/peakPrice.model.js";
import { Package } from "../models/package.model.js";
import { Booking } from "../models/booking.model.js";
import { istDate } from "../utils/dates.js";
import { apiError } from "../utils/apiError.js";

const tagNames = (tags = []) => tags.filter(Boolean).map((t) => t.displayName || t.name);

// Generates a customer-friendly reference ID, e.g. "BK-842910XYZ"
const generateReferenceId = () => {
    const timePart = Date.now().toString().slice(-6);
    const randPart = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `BK-${timePart}${randPart}`;
};

/* ---------- Customer: visible performers + their upcoming peak periods + tag list ---------- */
export const getPublicPerformerList = async () => {
    try {
        const performers = await Performer.find({ visibility: "visible" })
            .select("fullName basePrice profilePhoto experience tags")
            .populate("tags", "name displayName")
            .sort({ fullName: 1 })
            .lean();

        // One query for all peak periods that haven't ended yet (dates are "YYYY-MM-DD" strings).
        const peaks = await PeakPrice.find({
            performer: { $in: performers.map((p) => p._id) },
            to: { $gte: istDate(0) }
        })
            .select("performer from to peakPrice label")
            .sort({ from: 1 })
            .lean();

        const peaksByPerformer = new Map();
        for (const pk of peaks) {
            const key = String(pk.performer);
            if (!peaksByPerformer.has(key)) peaksByPerformer.set(key, []);
            peaksByPerformer.get(key).push({ from: pk.from, to: pk.to, price: pk.peakPrice, label: pk.label });
        }

        // Tag suggestions come from the same list, so only tags with a visible performer appear.
        const tagCounts = new Map();
        const list = performers.map((p) => {
            const tags = tagNames(p.tags);
            tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
            return {
                id: p._id,
                fullName: p.fullName,
                basePrice: p.basePrice,
                profilePhoto: p.profilePhoto,
                experience: p.experience,
                tags,
                peakPeriods: peaksByPerformer.get(String(p._id)) || []
            };
        });

        const tags = [...tagCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return { performers: list, tags };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: visible packages list ---------- */
export const getPublicPackageList = async () => {
    try {
        const packages = await Package.find({ visibility: "visible" })
            .select("packageName description price bulletFeatures workPhotos workVideos")
            .sort({ price: 1 })
            .lean();

        return packages;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: single visible performer details with media & active peaks ---------- */
export const getPublicPerformerById = async (performerId) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const performer = await Performer.findOne({ _id: performerId, visibility: "visible" })
            .populate("tags", "name displayName")
            .lean();

        if (!performer) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist or is currently unavailable");
        }

        // Fetch upcoming peak prices for this performer
        const peaks = await PeakPrice.find({
            performer: performerId,
            to: { $gte: istDate(0) }
        })
            .select("from to peakPrice label")
            .sort({ from: 1 })
            .lean();

        return {
            ...performer,
            peakPeriods: peaks
        };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: single visible package details ---------- */
export const getPublicPackageById = async (packageId) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        const pkg = await Package.findOne({ _id: packageId, visibility: "visible" }).lean();
        if (!pkg) {
            throw new apiError(404, "Package Not Found", "Package does not exist or is currently unavailable");
        }

        return pkg;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: request booking for a solo performer ---------- */
export const bookPerformerService = async (performerId, bookingData) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const {
            customerName,
            phone,
            email,
            eventType,
            eventDate,
            eventTime,
            eventAddress,
            expectedGuests,
            additionalNote
        } = bookingData;

        if (!customerName || !phone || !eventType || !eventDate || !eventTime || !eventAddress) {
            throw new apiError(400, "Validation Error", "customerName, phone, eventType, eventDate, eventTime, and eventAddress are required");
        }

        // Verify eventDate is not in the past
        if (eventDate < istDate(0)) {
            throw new apiError(400, "Invalid Date", "Event date cannot be in the past");
        }

        // Verify performer is visible
        const performer = await Performer.findOne({ _id: performerId, visibility: "visible" }).select("basePrice fullName");
        if (!performer) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist or is currently unavailable");
        }

        // Check if eventDate falls into any active PeakPrice period for this performer
        const activePeak = await PeakPrice.findOne({
            performer: performerId,
            from: { $lte: eventDate },
            to: { $gte: eventDate }
        });

        // Price is peakPrice if applicable, otherwise basePrice
        const quotedAmount = activePeak ? activePeak.peakPrice : performer.basePrice;

        let referenceId = generateReferenceId();
        // Ensure referenceId uniqueness
        while (await Booking.exists({ referenceId })) {
            referenceId = generateReferenceId();
        }

        const booking = await Booking.create({
            referenceId,
            customerName: customerName.trim(),
            phone: phone.trim(),
            email: email ? email.trim().toLowerCase() : undefined,
            bookingType: "solo",
            requestedPerformer: performerId,
            eventType: eventType.trim(),
            eventDate,
            eventTime: eventTime.trim(),
            eventAddress: eventAddress.trim(),
            expectedGuests: expectedGuests ? Number(expectedGuests) : undefined,
            additionalNote: additionalNote ? additionalNote.trim() : undefined,
            status: "requested",
            quotedAmount,
            finalAmount: quotedAmount
        });

        return {
            referenceId: booking.referenceId,
            status: booking.status,
            customerName: booking.customerName,
            performerName: performer.fullName,
            eventDate: booking.eventDate,
            eventTime: booking.eventTime,
            quotedAmount: booking.quotedAmount,
            message: "Booking request submitted successfully! Please save your reference ID to track status."
        };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: request booking for a package ---------- */
export const bookPackageService = async (packageId, bookingData) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        const {
            customerName,
            phone,
            email,
            eventType,
            eventDate,
            eventTime,
            eventAddress,
            expectedGuests,
            additionalNote
        } = bookingData;

        if (!customerName || !phone || !eventType || !eventDate || !eventTime || !eventAddress) {
            throw new apiError(400, "Validation Error", "customerName, phone, eventType, eventDate, eventTime, and eventAddress are required");
        }

        if (eventDate < istDate(0)) {
            throw new apiError(400, "Invalid Date", "Event date cannot be in the past");
        }

        // Verify package is visible
        const pkg = await Package.findOne({ _id: packageId, visibility: "visible" }).select("packageName price");
        if (!pkg) {
            throw new apiError(404, "Package Not Found", "Package does not exist or is currently unavailable");
        }

        let referenceId = generateReferenceId();
        while (await Booking.exists({ referenceId })) {
            referenceId = generateReferenceId();
        }

        const booking = await Booking.create({
            referenceId,
            customerName: customerName.trim(),
            phone: phone.trim(),
            email: email ? email.trim().toLowerCase() : undefined,
            bookingType: "package",
            package: packageId,
            packageName: pkg.packageName,
            eventType: eventType.trim(),
            eventDate,
            eventTime: eventTime.trim(),
            eventAddress: eventAddress.trim(),
            expectedGuests: expectedGuests ? Number(expectedGuests) : undefined,
            additionalNote: additionalNote ? additionalNote.trim() : undefined,
            status: "requested",
            quotedAmount: pkg.price,
            finalAmount: pkg.price
        });

        return {
            referenceId: booking.referenceId,
            status: booking.status,
            customerName: booking.customerName,
            packageName: pkg.packageName,
            eventDate: booking.eventDate,
            eventTime: booking.eventTime,
            quotedAmount: booking.quotedAmount,
            message: "Package booking request submitted successfully! Please save your reference ID to track status."
        };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

/* ---------- Customer: check booking status via reference ID ---------- */
export const getBookingStatusService = async (referenceId) => {
    try {
        if (!referenceId || typeof referenceId !== "string" || !referenceId.trim()) {
            throw new apiError(400, "Invalid Reference ID", "Please provide a valid booking reference ID");
        }

        const booking = await Booking.findOne({ referenceId: referenceId.trim().toUpperCase() })
            .select("referenceId customerName bookingType requestedPerformer packageName eventType eventDate eventTime eventAddress status quotedAmount finalAmount createdAt")
            .populate("requestedPerformer", "fullName profilePhoto")
            .lean();

        if (!booking) {
            throw new apiError(404, "Booking Not Found", `No booking found with reference ID: ${referenceId}`);
        }

        return booking;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};