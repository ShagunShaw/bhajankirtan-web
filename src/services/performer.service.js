import mongoose from "mongoose";
import { Performer } from "../models/performer.model.js";
import { Tag } from "../models/tags.model.js";
import { Booking } from "../models/booking.model.js";
import { PeakPrice } from "../models/peakPrice.model.js";
import { apiError } from "../utils/apiError.js";

export const getAllPerformersService = async (query = {}) => {
    try {
        const filter = {};

        if (query.visibility && ["visible", "hidden"].includes(query.visibility)) {
            filter.visibility = query.visibility;
        }

        if (query.search && typeof query.search === "string" && query.search.trim()) {
            filter.fullName = { $regex: query.search.trim(), $options: "i" };
        }

        const performers = await Performer.find(filter)
            .populate("tags", "name displayName")
            .sort({ fullName: 1 })
            .lean();

        return performers;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const getPerformerByIdService = async (performerId) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const performer = await Performer.findById(performerId)
            .populate("tags", "name displayName")
            .lean();

        if (!performer) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist");
        }

        return performer;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const createPerformerService = async (data) => {
    try {
        const {
            fullName,
            about,
            basePrice,
            tags, Ask claude to fix this: that when a NEW tag is entered, how will we store it in our tag schema and then how will it get stored in our performer schema
            workPhotos,
            workVideoLinks,
            profilePhoto,
            visibility,
            experience
        } = data;

        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            throw new apiError(400, "Validation Error", "Full name is required");
        }

        const priceValue = Number(basePrice);
        if (basePrice == null || !Number.isFinite(priceValue) || priceValue < 1) {
            throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
        }

        // Validate tags if provided
        if (tags && Array.isArray(tags)) {
            for (const tagId of tags) {
                if (!mongoose.isValidObjectId(tagId)) {
                    throw new apiError(400, "Invalid Tag", `Invalid tag ID provided: ${tagId}`);
                }
            }
        }

        const performer = await Performer.create({
            fullName: fullName.trim(),
            about: typeof about === "string" ? about.trim() : "",
            basePrice: priceValue,
            tags: Array.isArray(tags) ? tags : [],
            workPhotos: Array.isArray(workPhotos) ? workPhotos : [],
            workVideoLinks: Array.isArray(workVideoLinks) ? workVideoLinks : [],
            profilePhoto: typeof profilePhoto === "string" ? profilePhoto.trim() : "",
            visibility: visibility === "hidden" ? "hidden" : "visible",
            experience: typeof experience === "string" ? experience.trim() : ""
        });

        await performer.populate("tags", "name displayName");
        
        return performer.toObject();
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

Again yha claude se karao ki koi yha tag aaya toh wo tag schema mei fill kaise hoga
export const updatePerformerService = async (performerId, updateData) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const existing = await Performer.findById(performerId);
        if (!existing) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist");
        }

        const allowedUpdates = {};

        if (updateData.fullName !== undefined) {
            if (typeof updateData.fullName !== "string" || !updateData.fullName.trim()) {
                throw new apiError(400, "Validation Error", "Full name cannot be empty");
            }
            allowedUpdates.fullName = updateData.fullName.trim();
        }

        if (updateData.about !== undefined) {
            allowedUpdates.about = typeof updateData.about === "string" ? updateData.about.trim() : "";
        }

        if (updateData.basePrice !== undefined) {
            const priceValue = Number(updateData.basePrice);
            if (!Number.isFinite(priceValue) || priceValue < 1) {
                throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
            }
            allowedUpdates.basePrice = priceValue;
        }

        if (updateData.tags !== undefined) {
            if (!Array.isArray(updateData.tags)) {
                throw new apiError(400, "Validation Error", "Tags must be an array of IDs");
            }
            for (const tagId of updateData.tags) {
                if (!mongoose.isValidObjectId(tagId)) {
                    throw new apiError(400, "Invalid Tag", `Invalid tag ID: ${tagId}`);
                }
            }
            allowedUpdates.tags = updateData.tags;
        }

        if (updateData.workPhotos !== undefined) {
            if (!Array.isArray(updateData.workPhotos) || updateData.workPhotos.length > 10) {
                throw new apiError(400, "Validation Error", "Work photos must be an array with max 10 photos");
            }
            allowedUpdates.workPhotos = updateData.workPhotos;
        }

        if (updateData.workVideoLinks !== undefined) {
            if (!Array.isArray(updateData.workVideoLinks)) {
                throw new apiError(400, "Validation Error", "Work video links must be an array");
            }
            allowedUpdates.workVideoLinks = updateData.workVideoLinks;
        }

        if (updateData.profilePhoto !== undefined) {
            allowedUpdates.profilePhoto = typeof updateData.profilePhoto === "string" ? updateData.profilePhoto.trim() : "";
        }

        if (updateData.visibility !== undefined) {
            if (!["visible", "hidden"].includes(updateData.visibility)) {
                throw new apiError(400, "Validation Error", "Visibility must be either 'visible' or 'hidden'");
            }
            allowedUpdates.visibility = updateData.visibility;
        }

        if (updateData.experience !== undefined) {
            allowedUpdates.experience = typeof updateData.experience === "string" ? updateData.experience.trim() : "";
        }

        const updated = await Performer.findByIdAndUpdate(
            performerId,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        )
            .populate("tags", "name displayName")
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

export const togglePerformerVisibilityService = async (performerId) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        // atomic toggle using MongoDB pipeline update
        const updated = await Performer.findByIdAndUpdate(
            performerId,
            [
                {
                    $set: {
                        visibility: {
                            $cond: {
                                if: { $eq: ["$visibility", "visible"] },
                                then: "hidden",
                                else: "visible"
                            }
                        }
                    }
                }
            ],
            { new: true }
        ).select("_id fullName visibility");

        if (!updated) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist");
        }

        return {
            performerId: updated._id,
            fullName: updated.fullName,
            visibility: updated.visibility
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

export const deletePerformerService = async (performerId) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const performer = await Performer.findById(performerId).select("_id fullName");
        if (!performer) {
            throw new apiError(404, "Performer Not Found", "Performer does not exist or has already been deleted");
        }

        // Integrity check: Check if performer has active (requested or confirmed) bookings
        const activeBooking = await Booking.findOne({
            $or: [
                { requestedPerformer: performerId },
                { "allotments.performer": performerId }
            ],
            status: { $in: ["requested", "confirmed"] }
        }).select("referenceId status");

        if (activeBooking) {
            throw new apiError(
                409,
                "Cannot Delete Performer",
                `Cannot delete ${performer.fullName} because they have an active booking (${activeBooking.referenceId} - ${activeBooking.status}). Set visibility to 'hidden' instead.`
            );
        }

        // Clean up performer's peak price rules and delete performer
        await Promise.all([
            PeakPrice.deleteMany({ performer: performerId }),
            Performer.findByIdAndDelete(performerId)
        ]);

        return {
            performerId: performer._id,
            fullName: performer.fullName
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
