import mongoose, { Schema } from "mongoose";

const logSchema = new Schema(
  {
    // A fixed identifier so there is always exactly 1 document in this collection
    key: {
      type: String,
      default: "booking_cleanup",
      unique: true
    },
    // The cutoff date: any booking before this date was deleted
    lastCleanedUpBeforeDate: {
      type: Date
    }
  },
  { timestamps: true }
);

export const Log = mongoose.model("Log", logSchema);