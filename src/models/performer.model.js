import mongoose, { Schema } from "mongoose";

const performerSchema = new Schema(
    {
        fullName: {
            type: String,
            required: true,
            trim: true,
            index: true
        },
        about: {
            type: String,
            trim: true
        },
        basePrice: {
            type: Number,
            required: true,
            min: 1
        },
        tags: {
            type: [{ type: Schema.Types.ObjectId, ref: "Tag" }],
            index: true
        },
        workPhotos: [
            String
        ],
        workVideoLinks: [
            String
        ],
        profilePhoto: {
            type: String
        },
        visibility: {
            type: String,
            enum: ["visible", "hidden"],
            default: "visible",
            index: true
        },
        experience: {
            type: String,
            trim: true
        }
    },
    { timestamps: true }
);

export const Performer = mongoose.model("Performer", performerSchema);