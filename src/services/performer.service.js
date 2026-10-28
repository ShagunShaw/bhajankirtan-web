import mongoose from "mongoose";
import { Performer } from "../models/performer.model.js";
import { Booking } from "../models/booking.model.js";
import { PeakPrice } from "../models/peakPrice.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";
import { resolveTagIds, incrementTagCounts, decrementTagCounts } from "../services/tag.service.js";

const tagNames = (tags = []) => tags.filter(Boolean).map((t) => t.displayName || t.name);

const YOUTUBE = /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//i;

// Helper to safely parse array of URLs sent from frontend (handles stringified JSON or single string)
const parseMediaList = (mediaInput) => {
    if (!mediaInput) return [];
    if (Array.isArray(mediaInput)) return mediaInput;
    if (typeof mediaInput === "string") {
        try {
            const parsed = JSON.parse(mediaInput);
            if (Array.isArray(parsed)) return parsed;
        } catch {
            return [mediaInput];
        }
    }
    return [];
};

const cleanVideoLinks = (links) => {
    if (!links) return [];
    let raw = links;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) raw = parsed;
        } catch {
            raw = raw.split(",").map((s) => s.trim()).filter(Boolean);
        }
    }
    if (!Array.isArray(raw)) throw new apiError(400, "Validation Error", "Work video links must be an array");
    const cleaned = raw.map((l) => (typeof l === "string" ? l.trim() : "")).filter(Boolean);
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

export const createPerformerService = async (data, files = {}) => {
    try {
        const { fullName, about, basePrice, tags, workVideoLinks, visibility, experience } = data;

        if (!fullName || typeof fullName !== "string" || !fullName.trim()) {
            throw new apiError(400, "Validation Error", "Full name is required");
        }

        const priceValue = Number(basePrice);
        if (basePrice == null || String(basePrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
            throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
        }

        // Upload Profile Photo if provided in files
        let profilePhotoUrl = "";
        if (files?.profilePhoto && files.profilePhoto.length > 0) {
            const uploadedProfile = await uploadOnCloudinary(
                files.profilePhoto[0].path,
                "bhajankirtan/performers/profile"
            );
            profilePhotoUrl = uploadedProfile?.secure_url || "";
        } else if (typeof data.profilePhoto === "string") {
            profilePhotoUrl = data.profilePhoto.trim();
        }

        // Upload workPhotos to Cloudinary if provided
        const photoUploadPromises = (files?.workPhotos || []).map((file) =>
            uploadOnCloudinary(file.path, "bhajankirtan/performers/photos")
        );
        // Upload workVideos to Cloudinary if provided
        const videoUploadPromises = (files?.workVideos || []).map((file) =>
            uploadOnCloudinary(file.path, "bhajankirtan/performers/videos")
        );

        const [uploadedPhotos, uploadedVideos] = await Promise.all([
            Promise.all(photoUploadPromises),
            Promise.all(videoUploadPromises)
        ]);

        const newPhotoUrls = uploadedPhotos.filter(Boolean).map((res) => res.secure_url);
        const newVideoUrls = uploadedVideos.filter(Boolean).map((res) => res.secure_url);

        const workPhotos = [...parseMediaList(data.workPhotos), ...newPhotoUrls];
        const workVideos = [...parseMediaList(data.workVideos), ...newVideoUrls];

        if (workPhotos.length > 10) {
            throw new apiError(400, "Validation Error", "Maximum 10 work photos allowed per performer");
        }

        if (workVideos.length > 5) {
            throw new apiError(400, "Validation Error", "Maximum 5 work videos allowed per performer");
        }

        const links = workVideoLinks !== undefined ? cleanVideoLinks(workVideoLinks) : [];

        // Tags go last: everything else is validated first, so a bad request never leaves stray tags behind
        const tagIds = tags !== undefined ? await resolveTagIds(tags) : [];

        const performer = await Performer.create({
            fullName: fullName.trim(),
            about: typeof about === "string" ? about.trim() : "",
            basePrice: priceValue,
            tags: tagIds,
            workPhotos,
            workVideos,
            workVideoLinks: links,
            profilePhoto: profilePhotoUrl,
            visibility: visibility === "hidden" ? "hidden" : "visible",
            experience: typeof experience === "string" ? experience.trim() : ""
        });

        if (tagIds.length > 0) {
            await incrementTagCounts(tagIds);
        }

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

export const updatePerformerService = async (performerId, updateData, files = {}) => {
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
            if (String(updateData.basePrice).trim() === "" || !Number.isFinite(priceValue) || priceValue < 1) {
                throw new apiError(400, "Validation Error", "Base price must be a valid number greater than or equal to 1");
            }
            allowedUpdates.basePrice = priceValue;
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

        if (updateData.workVideoLinks !== undefined) {
            allowedUpdates.workVideoLinks = cleanVideoLinks(updateData.workVideoLinks);
        }

        // Handle Profile Photo
        const hasNewProfilePhoto = Boolean(files?.profilePhoto && files.profilePhoto.length > 0);
        if (hasNewProfilePhoto) {
            const uploadedProfile = await uploadOnCloudinary(
                files.profilePhoto[0].path,
                "bhajankirtan/performers/profile"
            );
            if (uploadedProfile?.secure_url) {
                if (existing.profilePhoto) {
                    deleteFromCloudinary(existing.profilePhoto, "image");
                }
                allowedUpdates.profilePhoto = uploadedProfile.secure_url;
            }
        } else if (updateData.profilePhoto !== undefined) {
            const newPhoto = typeof updateData.profilePhoto === "string" ? updateData.profilePhoto.trim() : "";
            if (!newPhoto && existing.profilePhoto) {
                deleteFromCloudinary(existing.profilePhoto, "image");
            }
            allowedUpdates.profilePhoto = newPhoto;
        }

        // Handle Binary Files Upload for workPhotos & workVideos
        const hasNewPhotos = Boolean(files?.workPhotos && files.workPhotos.length > 0);
        const hasNewVideos = Boolean(files?.workVideos && files.workVideos.length > 0);

        let newPhotoUrls = [];
        let newVideoUrls = [];

        if (hasNewPhotos) {
            const newPhotoUploads = await Promise.all(
                files.workPhotos.map((file) => uploadOnCloudinary(file.path, "bhajankirtan/performers/photos"))
            );
            newPhotoUrls = newPhotoUploads.filter(Boolean).map((res) => res.secure_url);
        }

        if (hasNewVideos) {
            const newVideoUploads = await Promise.all(
                files.workVideos.map((file) => uploadOnCloudinary(file.path, "bhajankirtan/performers/videos"))
            );
            newVideoUrls = newVideoUploads.filter(Boolean).map((res) => res.secure_url);
        }

        // Handle Work Photos Replacement & Cloudinary Cleanup for REMOVED items
        if (updateData.existingPhotos !== undefined || updateData.workPhotos !== undefined || hasNewPhotos) {
            const retainedPhotos = updateData.existingPhotos !== undefined
                ? parseMediaList(updateData.existingPhotos)
                : updateData.workPhotos !== undefined && !hasNewPhotos
                    ? parseMediaList(updateData.workPhotos)
                    : (existing.workPhotos || []);

            // Identify old photos that were removed and delete them from Cloudinary
            if (updateData.existingPhotos !== undefined || (updateData.workPhotos !== undefined && !hasNewPhotos)) {
                const photosToDelete = (existing.workPhotos || []).filter(
                    (oldUrl) => !retainedPhotos.includes(oldUrl)
                );
                if (photosToDelete.length > 0) {
                    Promise.allSettled(photosToDelete.map((url) => deleteFromCloudinary(url, "image")));
                }
            }

            const finalPhotos = [...retainedPhotos, ...newPhotoUrls];
            if (finalPhotos.length > 10) {
                throw new apiError(400, "Validation Error", "Maximum 10 work photos allowed per performer");
            }
            allowedUpdates.workPhotos = finalPhotos;
        }

        // Handle Work Videos Replacement & Cloudinary Cleanup for REMOVED items
        if (updateData.existingVideos !== undefined || updateData.workVideos !== undefined || hasNewVideos) {
            const retainedVideos = updateData.existingVideos !== undefined
                ? parseMediaList(updateData.existingVideos)
                : updateData.workVideos !== undefined && !hasNewVideos
                    ? parseMediaList(updateData.workVideos)
                    : (existing.workVideos || []);

            // Identify old videos that were removed and delete them from Cloudinary
            if (updateData.existingVideos !== undefined || (updateData.workVideos !== undefined && !hasNewVideos)) {
                const videosToDelete = (existing.workVideos || []).filter(
                    (oldUrl) => !retainedVideos.includes(oldUrl)
                );
                if (videosToDelete.length > 0) {
                    Promise.allSettled(videosToDelete.map((url) => deleteFromCloudinary(url, "video")));
                }
            }

            const finalVideos = [...retainedVideos, ...newVideoUrls];
            if (finalVideos.length > 5) {
                throw new apiError(400, "Validation Error", "Maximum 5 work videos allowed per performer");
            }
            allowedUpdates.workVideos = finalVideos;
        }

        // Tags update: diff tags and update counts
        if (updateData.tags !== undefined) {
            const newTagIds = await resolveTagIds(updateData.tags);
            allowedUpdates.tags = newTagIds;

            const existingTagIds = (existing.tags || []).map((id) => id.toString());
            const newTagIdStrs = newTagIds.map((id) => id.toString());

            const tagsToAdd = newTagIdStrs.filter((id) => !existingTagIds.includes(id));
            const tagsToRemove = existingTagIds.filter((id) => !newTagIdStrs.includes(id));

            if (tagsToAdd.length > 0) {
                await incrementTagCounts(tagsToAdd);
            }
            if (tagsToRemove.length > 0) {
                await decrementTagCounts(tagsToRemove);
            }
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

        const performer = await Performer.findById(performerId).select("_id fullName profilePhoto workPhotos workVideos tags");
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

        // Delete all associated photos and videos from Cloudinary in parallel
        const photoDeletions = (performer.workPhotos || []).map((url) => deleteFromCloudinary(url, "image"));
        if (performer.profilePhoto) {
            photoDeletions.push(deleteFromCloudinary(performer.profilePhoto, "image"));
        }
        const videoDeletions = (performer.workVideos || []).map((url) => deleteFromCloudinary(url, "video"));
        await Promise.allSettled([...photoDeletions, ...videoDeletions]);

        // Decrement tag counts and remove any tag whose count reaches 0
        if (performer.tags && performer.tags.length > 0) {
            await decrementTagCounts(performer.tags);
        }

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
