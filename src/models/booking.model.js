import mongoose, { Schema } from "mongoose";

const allotmentSchema = new Schema(
  {
    performer: { 
        type: Schema.Types.ObjectId, 
        ref: "Performer", 
        required: true 

    },
    role: { 
        type: String, 
        trim: true 


    }, // optional, e.g. "dholak"
    status: { 
        type: String, 
        enum: ["assigned", "cancelled"], 
        default: "assigned" 

    },
    cancelReason: { 
        type: String, 
        trim: true 

    },
    cancelledAt: Date
  },
  { timestamps: true }
);

const bookingSchema = new Schema(
  {
    referenceId: { 
        type: String, 
        required: true, 
        unique: true 

    },
    customerName: { 
        type: String, 
        required: true, 
        trim: true 

    },
    phone: { 
        type: String, 
        required: true, 
        trim: true 

    },
    email: { 
        type: String, 
        trim: true, 
        lowercase: true 

    },

    bookingType: { 
        type: String, 
        enum: ["solo", "package"], 
        required: true 
    },
    requestedPerformer: { 
        type: Schema.Types.ObjectId, 
        ref: "Performer" 
    }, // solo only
    package: { 
        type: Schema.Types.ObjectId, 
        ref: "Package" 
    },              // package only
    packageName: { 
        type: String, 
        trim: true 
    },                             // snapshot at request time

    eventType: { 
        type: String, 
        required: true, 
        trim: true 
    },
    eventDate: { 
        type: String, 
        required: true, 
        match: /^\d{4}-\d{2}-\d{2}$/ 
    },
    eventTime: { 
        type: String, 
        required: true 
    }, // "HH:mm"
    eventAddress: { 
        type: String, 
        required: true, 
        trim: true 
    },
    expectedGuests: { 
        type: Number, 
        min: 1 
    },
    additionalNote: { 
        type: String, 
        trim: true 
    },

    status: {
      type: String,
      enum: ["requested", "confirmed", "rejected", "cancelled", "completed"],
      default: "requested"
    },
    allotments: [allotmentSchema],

    quotedAmount: { 
        type: Number, 
        required: true, 
        min: 0, 
        immutable: true 
    }, 
    finalAmount: { 
        type: Number, 
        min: 0 
    },                                   // starts equal to quotedAmount (e.g. 750 after discount)
    priceChangeReason: { 
        type: String, 
        trim: true, 
        maxlength: 200 
    },        
    markedReconfirmed: { 
        type: Boolean, 
        default: false 
    },
    cancelledBy: { 
        type: String, 
        enum: ["customer", "admin", "performer"] 
    },
    cancelledAt: Date,
    cancelReason: { 
        type: String, 
        trim: true 
    }
  },
  { timestamps: true }
);

bookingSchema.pre("validate", function () {
  if (this.bookingType === "solo" && !this.requestedPerformer)
    return next(new Error("Solo booking needs a performer"));
  if (this.bookingType === "package" && !this.package)
    return next(new Error("Package booking needs a package"));
  if (this.isNew && this.finalAmount == null) this.finalAmount = this.quotedAmount;
});

bookingSchema.index({ status: 1, eventDate: 1 });
bookingSchema.index({ eventDate: 1, "allotments.performer": 1 });

// export const Booking = mongoose.model("Booking", bookingSchema);
export const Booking = mongoose.models.Booking || mongoose.model("Booking", bookingSchema);