import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure temporary upload directory exists
const tempDir = path.resolve("public/temp");
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, tempDir);
    },
    filename: function (req, file, cb) {
        // Sanitize original file name and append timestamp
        const sanitized = file.originalname.replace(/\s+/g, "-");
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        cb(null, `${uniqueSuffix}-${sanitized}`);
    }
});

// File filter for images and videos
const fileFilter = (req, file, cb) => {
    const isImage = file.mimetype.startsWith("image/");
    const isVideo = file.mimetype.startsWith("video/");

    if (isImage || isVideo) {
        cb(null, true);
    } else {
        cb(new Error("Unsupported file format! Only images and videos are allowed."), false);
    }
};

export const upload = multer({
    storage,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB max per video/photo
    },
    fileFilter
});

// Reusable multer fields configuration for package uploads
export const uploadPackageMedia = upload.fields([
    { name: "workPhotos", maxCount: 15 },
    { name: "workVideos", maxCount: 5 }
]);
