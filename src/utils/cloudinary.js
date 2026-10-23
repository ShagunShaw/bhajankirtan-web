import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

export const uploadOnCloudinary = async (localFilePath, folder = "bhajankirtan/packages") => {
    try {
        if (!localFilePath) return null;

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto", // Automatically detects whether it's an image or video
            folder
        });

        // Once successfully uploaded, delete the temporary file from local disk
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }

        return response;
    } catch (error) {
        // Remove the locally saved temporary file as the upload operation failed
        if (fs.existsSync(localFilePath)) {
            fs.unlinkSync(localFilePath);
        }
        console.error("Cloudinary Upload Error:", error.message);
        return null;
    }
};

export const deleteFromCloudinary = async (fileUrl, resourceType = "image") => {
    try {
        if (!fileUrl || typeof fileUrl !== "string") return null;

        // Cloudinary URL format: .../upload/(v12345/)?folder/subfolder/publicId.ext
        const uploadIndex = fileUrl.indexOf("/upload/");
        if (uploadIndex === -1) return null;

        const pathAfterUpload = fileUrl.substring(uploadIndex + 8);
        const withoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
        const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf("."));

        return await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (error) {
        console.error("Cloudinary Delete Error:", error.message);
        return null;
    }
};
