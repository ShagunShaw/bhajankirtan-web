import mongoose from "mongoose";
import { Performer } from "../models/performer.model.js";
import { Booking } from "../models/booking.model.js";
import { PeakPrice } from "../models/peakPrice.model.js";
import { apiError } from "../utils/apiError.js";
import { resolveTagIds } from "../services/tag.service.js"


const tagNames = (tags = []) => tags.filter(Boolean).map((t) => t.displayName || t.name);

const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i;

const cleanVideoLinks = (links) => {
    if (!Array.isArray(links)) throw new apiError(400, "Validation Error", "Work video links must be an array");
    const cleaned = links.map((l) => (typeof l === "string" ? l.trim() : "")).filter(Boolean);
    if (cleaned.some((l) => !YOUTUBE.test(l))) {
        throw new apiError(400, "Validation Error", "Video links must be YouTube links");
    }
    return cleaned;
};


export const getAllPerformersService = async () => {
    try {
        const performers = await Performer.find()
            .select("fullName basePrice profilePhoto experience tags visibility createdAt")
            .populate("tags", "name displayName")
            .sort({ createdAt: -1 })
            .lean();

        return performers.map((p) => ({
            id: p._id,
            fullName: p.fullName,
            basePrice: p.basePrice,
            profilePhoto: p.profilePhoto,
            experience: p.experience,
            visibility: p.visibility,
            tags: tagNames(p.tags),
            createdAt: p.createdAt
        }));
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
        const { fullName, about, basePrice, tags, workPhotos, workVideoLinks, profilePhoto, visibility, experience } = data;

        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            throw new apiError(400, "Validation Error", "Full name is required");
        }

        const priceValue = Number(basePrice);
        if (basePrice == null || String(basePrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
            throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
        }

        if (workPhotos !== undefined && (!Array.isArray(workPhotos) || workPhotos.length > 10)) {
            throw new apiError(400, "Validation Error", "Work photos must be an array with max 10 photos");
        }

        const links = workVideoLinks !== undefined ? cleanVideoLinks(workVideoLinks) : [];

        // Tags go last: everything else is validated first, so a bad request never leaves stray tags behind
        const tagIds = tags !== undefined ? await resolveTagIds(tags) : [];

        const performer = await Performer.create({
            fullName: fullName.trim(),
            about: typeof about === "string" ? about.trim() : "",
            basePrice: priceValue,
            tags: tagIds,
            workPhotos: Array.isArray(workPhotos) ? workPhotos : [],
            workVideoLinks: links,
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

export const updatePerformerService = async (performerId, updateData) => {
    try {
        if (!mongoose.isValidObjectId(performerId)) {
            throw new apiError(400, "Invalid ID", "The provided performer ID is invalid");
        }

        const existing = await Performer.findById(performerId).select("_id");
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
            if (String(updateData.basePrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
                throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
            }
            allowedUpdates.basePrice = priceValue;
        }

        if (updateData.workPhotos !== undefined) {
            if (!Array.isArray(updateData.workPhotos) || updateData.workPhotos.length > 10) {
                throw new apiError(400, "Validation Error", "Work photos must be an array with max 10 photos");
            }
            allowedUpdates.workPhotos = updateData.workPhotos;
        }

        if (updateData.workVideoLinks !== undefined) {
            allowedUpdates.workVideoLinks = cleanVideoLinks(updateData.workVideoLinks);
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

        // Tags last, same reason as create. The list sent REPLACES the performer's tags;
        // an empty list removes all tags.
        if (updateData.tags !== undefined) {
            allowedUpdates.tags = await resolveTagIds(updateData.tags);
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
            { new: true, updatePipeline: true }
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
