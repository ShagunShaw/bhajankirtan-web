import mongoose, { Schema } from "mongoose";

export const normalizeTag = (v) =>
  typeof v === "string" ? v.trim().toLowerCase().replace(/\s+/g, " ") : v;

const tagSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      minlength: 2,
      maxlength: 40,
      set: normalizeTag
    },
    displayName: {    // original casing for showing to users 
      type: String,
      trim: true,
      maxlength: 40
    }
  }
);

export const Tag = mongoose.model("Tag", tagSchema);