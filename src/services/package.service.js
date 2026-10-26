import mongoose from "mongoose";
import { Package } from "../models/package.model.js";
import { Booking } from "../models/booking.model.js";
import { uploadOnCloudinary, deleteFromCloudinary } from "../utils/cloudinary.js";
import { apiError } from "../utils/apiError.js";

// Helper to normalize bulletFeatures if sent as JSON string or comma-separated string from multipart/form-data
const parseBulletFeatures = (features) => {
    if (!features) return [];
    if (Array.isArray(features)) return features.map((f) => String(f).trim()).filter(Boolean);
    if (typeof features === "string") {
        try {
            const parsed = JSON.parse(features);
            if (Array.isArray(parsed)) return parsed.map((f) => String(f).trim()).filter(Boolean);
        } catch {
            return features.split(",").map((f) => f.trim()).filter(Boolean);
        }
    }
    return [];
};

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

export const getAllPackagesService = async (query = {}) => {
    try {
        const filter = {};

        // If visibility is explicitly passed ("visible" or "hidden"), filter by it.
        // If omitted, filter remains {} and returns both visible and hidden packages.
        if (query.visibility && ["visible", "hidden"].includes(query.visibility)) {
            filter.visibility = query.visibility;
        }

        if (query.search && typeof query.search === "string" && query.search.trim()) {
            filter.packageName = { $regex: query.search.trim(), $options: "i" };
        }

        const packages = await Package.find(filter)
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

export const getPackageByIdService = async (packageId) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        const pkg = await Package.findById(packageId).lean();
        if (!pkg) {
            throw new apiError(404, "Package Not Found", "Package does not exist");
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

export const createPackageService = async (data, files = {}) => {
    try {
        const { packageName, description, price, bulletFeatures, visibility } = data;

        if (!packageName || typeof packageName !== "string" || !packageName.trim()) {
            throw new apiError(400, "Validation Error", "Package name is required");
        }

        const priceValue = Number(price);
        if (price == null || !Number.isFinite(priceValue) || priceValue < 1) {
            throw new apiError(400, "Validation Error", "Price must be a valid number greater than or equal to 1");
        }

        // Upload photos to Cloudinary only if provided (optional)
        const photoUploadPromises = (files?.workPhotos || []).map((file) =>
            uploadOnCloudinary(file.path, "bhajankirtan/packages/photos")
        );
        // Upload videos to Cloudinary only if provided (optional)
        const videoUploadPromises = (files?.workVideos || []).map((file) =>
            uploadOnCloudinary(file.path, "bhajankirtan/packages/videos")
        );

        const [uploadedPhotos, uploadedVideos] = await Promise.all([
            Promise.all(photoUploadPromises),
            Promise.all(videoUploadPromises)
        ]);

        const workPhotos = uploadedPhotos.filter(Boolean).map((res) => res.secure_url);
        const workVideos = uploadedVideos.filter(Boolean).map((res) => res.secure_url);

        if (workPhotos.length > 8) {
            throw new apiError(400, "Validation Error", "Maximum 8 work photos allowed per package");
        }

        if (workVideos.length > 3) {
            throw new apiError(400, "Validation Error", "Maximum 3 work videos allowed per package");
        }

        const newPackage = await Package.create({
            packageName: packageName.trim(),
            description: typeof description === "string" ? description.trim() : "",
            price: priceValue,
            bulletFeatures: parseBulletFeatures(bulletFeatures),
            workPhotos,
            workVideos,
            visibility: visibility === "hidden" ? "hidden" : "visible"
        });

        return newPackage.toObject();
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};

export const updatePackageService = async (packageId, data, files = {}) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        const existing = await Package.findById(packageId);
        if (!existing) {
            throw new apiError(404, "Package Not Found", "Package does not exist");
        }

        const allowedUpdates = {};

        if (data.packageName !== undefined) {
            if (typeof data.packageName !== "string" || !data.packageName.trim()) {
                throw new apiError(400, "Validation Error", "Package name cannot be empty");
            }
            allowedUpdates.packageName = data.packageName.trim();
        }

        if (data.description !== undefined) {
            allowedUpdates.description = typeof data.description === "string" ? data.description.trim() : "";
        }

        if (data.price !== undefined) {
            const priceValue = Number(data.price);
            if (!Number.isFinite(priceValue) || priceValue < 1) {
                throw new apiError(400, "Validation Error", "Price must be a valid number greater than or equal to 1");
            }
            allowedUpdates.price = priceValue;
        }

        if (data.bulletFeatures !== undefined) {
            allowedUpdates.bulletFeatures = parseBulletFeatures(data.bulletFeatures);
        }

        if (data.visibility !== undefined) {
            if (!["visible", "hidden"].includes(data.visibility)) {
                throw new apiError(400, "Validation Error", "Visibility must be 'visible' or 'hidden'");
            }
            allowedUpdates.visibility = data.visibility;
        }

        // Handle Binary Files Upload (only uploads if new files are actually sent)
        const hasNewPhotos = Boolean(files?.workPhotos && files.workPhotos.length > 0);
        const hasNewVideos = Boolean(files?.workVideos && files.workVideos.length > 0);

        let newPhotoUrls = [];
        let newVideoUrls = [];

        if (hasNewPhotos) {
            const newPhotoUploads = await Promise.all(
                files.workPhotos.map((file) => uploadOnCloudinary(file.path, "bhajankirtan/packages/photos"))
            );
            newPhotoUrls = newPhotoUploads.filter(Boolean).map((res) => res.secure_url);
        }

        if (hasNewVideos) {
            const newVideoUploads = await Promise.all(
                files.workVideos.map((file) => uploadOnCloudinary(file.path, "bhajankirtan/packages/videos"))
            );
            newVideoUrls = newVideoUploads.filter(Boolean).map((res) => res.secure_url);
        }

        // Handle Media Replacement & Cloudinary Cleanup for REMOVED items
        // If data.existingPhotos is provided, it tells which existing URLs the admin wants to KEEP.
        // Any URL in existing.workPhotos that is NOT in existingPhotos was removed by the admin -> delete from Cloudinary!
        if (data.existingPhotos !== undefined || hasNewPhotos) {
            const retainedPhotos = data.existingPhotos !== undefined
                ? parseMediaList(data.existingPhotos)
                : (existing.workPhotos || []);

            // Identify old photos that were removed and delete them from Cloudinary
            if (data.existingPhotos !== undefined) {
                const photosToDelete = (existing.workPhotos || []).filter(
                    (oldUrl) => !retainedPhotos.includes(oldUrl)
                );
                if (photosToDelete.length > 0) {
                    Promise.allSettled(photosToDelete.map((url) => deleteFromCloudinary(url, "image")));
                }
            }

            const finalPhotos = [...retainedPhotos, ...newPhotoUrls];
            if (finalPhotos.length > 8) {
                throw new apiError(400, "Validation Error", "Maximum 8 work photos allowed per package");
            }
            allowedUpdates.workPhotos = finalPhotos;
        }

        // Same for Videos: delete removed videos from Cloudinary and combine with new ones
        if (data.existingVideos !== undefined || hasNewVideos) {
            const retainedVideos = data.existingVideos !== undefined
                ? parseMediaList(data.existingVideos)
                : (existing.workVideos || []);

            // Identify old videos that were removed and delete them from Cloudinary
            if (data.existingVideos !== undefined) {
                const videosToDelete = (existing.workVideos || []).filter(
                    (oldUrl) => !retainedVideos.includes(oldUrl)
                );
                if (videosToDelete.length > 0) {
                    Promise.allSettled(videosToDelete.map((url) => deleteFromCloudinary(url, "video")));
                }
            }

            const finalVideos = [...retainedVideos, ...newVideoUrls];
            if (finalVideos.length > 3) {
                throw new apiError(400, "Validation Error", "Maximum 3 work videos allowed per package");
            }
            allowedUpdates.workVideos = finalVideos;
        }

        const updated = await Package.findByIdAndUpdate(
            packageId,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        ).lean();

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

export const togglePackageVisibilityService = async (packageId) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        // Atomic toggle in 1 single DB call using MongoDB pipeline update
        const updated = await Package.findByIdAndUpdate(
            packageId,
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
        ).select("_id packageName visibility");

        if (!updated) {
            throw new apiError(404, "Package Not Found", "Package does not exist");
        }

        return {
            packageId: updated._id,
            packageName: updated.packageName,
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

export const deletePackageService = async (packageId) => {
    try {
        if (!mongoose.isValidObjectId(packageId)) {
            throw new apiError(400, "Invalid ID", "The provided package ID is invalid");
        }

        const pkg = await Package.findById(packageId).select("_id packageName workPhotos workVideos");
        if (!pkg) {
            throw new apiError(404, "Package Not Found", "Package does not exist or has already been deleted");
        }

        // Integrity check: Prevent deletion if any active (requested or confirmed) booking is linked
        const activeBooking = await Booking.findOne({
            package: packageId,
            status: { $in: ["requested", "confirmed"] }
        }).select("referenceId status");

        if (activeBooking) {
            throw new apiError(
                409,
                "Cannot Delete Package",
                `Cannot delete '${pkg.packageName}' because it is linked to active booking ${activeBooking.referenceId} (${activeBooking.status}). Set visibility to 'hidden' instead.`
            );
        }

        // Delete from MongoDB
        await Package.findByIdAndDelete(packageId);

        // Delete all associated photos and videos from Cloudinary in parallel
        const photoDeletions = (pkg.workPhotos || []).map((url) => deleteFromCloudinary(url, "image"));
        const videoDeletions = (pkg.workVideos || []).map((url) => deleteFromCloudinary(url, "video"));
        await Promise.allSettled([...photoDeletions, ...videoDeletions]);

        return {
            packageId: pkg._id,
            packageName: pkg.packageName
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
