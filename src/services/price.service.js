import mongoose from "mongoose";
import { Performer } from "../models/performer.model.js";
import { PeakPrice } from "../models/peakPrice.model.js";
import { apiError } from "../utils/apiError.js";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

// Pagination is not needed here as artists are limited (20-50) and active peak dates are few per year
export const getAllPricesService = async () => {
    try {
        const [performers, peakPrices] = await Promise.all([
            Performer.find({}, "fullName basePrice")
                .sort({ fullName: 1 })
                .lean(),
            PeakPrice.find({}, "-createdAt -updatedAt -__v")
                .populate("performer", "fullName")
                .sort({ from: 1 })
                .lean()
        ]);

        const basePrices = performers.map((p) => ({
            performerId: p._id,
            performer: p.fullName,
            basePrice: p.basePrice
        }));

        return {
            basePrices,
            peakPrices
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

export const updateBasePriceService = async (performerId, basePrice) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const value = Number(basePrice);
        if (basePrice == null || String(basePrice).trim() === "" || !Number.isFinite(value) || value < 1) {
            throw new apiError(400, "Invalid Base Price", "Base price must be a valid number greater than or equal to 1");
        }

        const updated = await Performer.findByIdAndUpdate(
            performerId,
            { $set: { basePrice: value } },
            { new: true, runValidators: true }
        ).select("_id fullName basePrice");

        if (!updated) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist");
        }

        return {
            performerId: updated._id,
            performer: updated.fullName,
            basePrice: updated.basePrice
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

export const createPeakPriceService = async ({ performer, label, from, to, peakPrice }) => {
    try {
        if (!performer || !mongoose.isValidObjectId(performer)) {
            throw new apiError(400, "Invalid Performer", "A valid performer ID is required");
        }

        if (!from || !DATE_REGEX.test(from)) {
            throw new apiError(400, "Invalid Start Date", "Start date 'from' must be in YYYY-MM-DD format");
        }

        if (!to || !DATE_REGEX.test(to)) {
            throw new apiError(400, "Invalid End Date", "End date 'to' must be in YYYY-MM-DD format");
        }

        if (to < from) {
            throw new apiError(400, "Invalid Date Range", "End date must be on or after the start date");
        }

        const priceValue = Number(peakPrice);
        if (peakPrice == null || String(peakPrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
            throw new apiError(400, "Invalid Peak Price", "Peak price must be a valid number greater than or equal to 1");
        }

        // Verify performer exists
        const performerDoc = await Performer.findById(performer).select("fullName");
        if (!performerDoc) {
            throw new apiError(404, "Performer Not Found", "The specified performer does not exist");
        }

        // Check for date range overlap for the same performer
        const overlap = await PeakPrice.findOne({
            performer,
            from: { $lte: to },
            to: { $gte: from }
        });

        if (overlap) {
            throw new apiError(
                409,
                "Date Overlap",
                `A peak price rule already exists for ${performerDoc.fullName} between ${overlap.from} and ${overlap.to}`
            );
        }

        const created = await PeakPrice.create({
            performer,
            label: typeof label === "string" ? label.trim().slice(0, 60) : "",
            from,
            to,
            peakPrice: priceValue
        });

        return {
            _id: created._id,
            performer: {
                _id: performerDoc._id,
                fullName: performerDoc.fullName
            },
            label: created.label,
            from: created.from,
            to: created.to,
            peakPrice: created.peakPrice
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

export const updatePeakPriceService = async (id, { label, from, to, peakPrice }) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            throw new apiError(400, "Invalid ID", "The provided peak price ID is invalid");
        }

        const existing = await PeakPrice.findById(id);
        if (!existing) {
            throw new apiError(404, "Peak Price Not Found", "Peak price record does not exist");
        }

        const newFrom = from !== undefined ? from : existing.from;
        const newTo = to !== undefined ? to : existing.to;

        if (from !== undefined && !DATE_REGEX.test(newFrom)) {
            throw new apiError(400, "Invalid Start Date", "Start date 'from' must be in YYYY-MM-DD format");
        }

        if (to !== undefined && !DATE_REGEX.test(newTo)) {
            throw new apiError(400, "Invalid End Date", "End date 'to' must be in YYYY-MM-DD format");
        }

        if (newTo < newFrom) {
            throw new apiError(400, "Invalid Date Range", "End date must be on or after the start date");
        }

        // If dates changed, check overlap excluding this current record
        if (from !== undefined || to !== undefined) {
            const overlap = await PeakPrice.findOne({
                _id: { $ne: id },
                performer: existing.performer,
                from: { $lte: newTo },
                to: { $gte: newFrom }
            });

            if (overlap) {
                throw new apiError(
                    409,
                    "Date Overlap",
                    `Another peak price rule already exists for this performer between ${overlap.from} and ${overlap.to}`
                );
            }
        }

        const updateData = {};
        if (label !== undefined) updateData.label = typeof label === "string" ? label.trim().slice(0, 60) : "";
        if (from !== undefined) updateData.from = newFrom;
        if (to !== undefined) updateData.to = newTo;
        if (peakPrice !== undefined) {
            const priceValue = Number(peakPrice);
            if (String(peakPrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
                throw new apiError(400, "Invalid Peak Price", "Peak price must be a valid number greater than or equal to 1");
            }
            updateData.peakPrice = priceValue;
        }

        const updated = await PeakPrice.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true, runValidators: true }
        )
        .select("-createdAt -updatedAt -__v")
        .populate("performer", "fullName")
        .lean();

        return updated;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const deletePeakPriceService = async (id) => {
    try {
        if (!mongoose.isValidObjectId(id)) {
            throw new apiError(400, "Invalid ID", "The provided peak price ID is invalid");
        }

        const deleted = await PeakPrice.findByIdAndDelete(id);
        if (!deleted) {
            throw new apiError(404, "Peak Price Not Found", "Peak price record does not exist or has already been deleted");
        }

        return { _id: id };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};