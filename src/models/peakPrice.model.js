import mongoose, { Schema } from "mongoose";

const dateStr = { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ };

const peakPriceSchema = new Schema(
  {
    performer: {
      type: Schema.Types.ObjectId,
      ref: "Performer",
      required: true

    },
    label: {
      type: String,
      trim: true,
      maxlength: 60

    },
    from: dateStr,
    to: {
      ...dateStr,
      validate: {
        validator: function (v) {
          if (!(this instanceof mongoose.Document)) return true; // update query: service already checks
          return v >= this.from;
        },
        message: "End date must be on or after the start date"
      }
    },
    peakPrice: {
      type: Number,
      required: true,
      min: 1

    }
  },
  { timestamps: true }
);

peakPriceSchema.index({ performer: 1, from: 1, to: 1 });

export const PeakPrice = mongoose.model("PeakPrice", peakPriceSchema);