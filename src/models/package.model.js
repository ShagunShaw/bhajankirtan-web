import mongoose, { Schema } from "mongoose";

const packageSchema = new Schema({
    packageName: {
        type: String,
        required: true,
        trim: true
    },
    startingPrice: {   // Base price
        type: Number,
        required: true,
        min: 1
    },
    bulletFeatures: {
        type: Array,
        default: []

    },
    workPhotos: [
        String
    ],
    workVideos: [       // This will not be a youTube video link, it will be uploaded directly in cloudinary
        String
    ],
    visibility:{
        type: String,
        enum: ["visible", "hidden"],
        default: "visible",
        index: true
    }
}, { timestamps: true })

export const Package = mongoose.model("Package", packageSchema);