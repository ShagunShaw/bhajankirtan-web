Also refund, reconfirmation and re-allotment wala part kaise handle krna h look at that too

import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
    customerName: {

    },
    phone: {

    },
    // package: {
    //     type: Schema.Types.ObjectId,
    //     ref: "Package"
    // },       OR
    // package: {
    //     type: String,
    //     enum: ["none", ],
    //     default: "none"
    // },
    eventType: {

    },
    eventDate: {
        index: true
    },
    eventTime: {

    },
    customerAddress: {

    },
    expectedGuests: {

    },
    additionalNote: {

    },
    isBookingConfirmed: {
        index: true
    },
    amount: {       // making it optional for now, as I need to verify from the client, whether price are fixed or can be negotiable via call

    }
}, { timestamps: true })

export const Booking = mongoose.model("Booking", bookingSchema);