import mongoose, { Schema } from "mongoose";

const performerSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true, 
        index: true
    },
    about: {        // making this field as optional
        type: String,
        trim: true,
    },
    basePrice: {
        type: Number,
        required: true,
        min: 1
    },
    tags: {
        type: Schema.Types.ObjectId,
        ref: "Tag",
        populate: { displayName }
    },
    workPhotos: [String],
    workVideoLinks: [String],
    profilePhoto: {
        type: String,
        required: true
    },
    visibility: {
        enum: ["visible", "hidden"],
        default: "visible"
    },
    experience: {   // making it as optional field
        type: String    // as it can be 'years' or 'months'
    }
}, {timestamps: true})


export const Performer = mongoose.model("Performer", performerSchema)