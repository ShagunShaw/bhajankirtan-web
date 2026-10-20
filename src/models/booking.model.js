Also refund, reconfirmation and re-allotment wala part kaise handle krna h look at that too
Also ask the client ki cutomer ka toh pura detail unko mil jayega, lkin unko contact back kaise karega

import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
    referenceId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
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
        index: true,        check this once, shyd yha pe 'index' ni lagana hoga hmlog ko
        enum: ["Yes", "No", "Rejected"],
        default: "No"
    },
    isBookingReConfirmed: {
        enum: ["Yes", "No"],
        default: "No"
    },
    amount: {       // making it optional for now, as I need to verify from the client, whether price are fixed or can be negotiable via call

    }
}, { timestamps: true })

export const Booking = mongoose.model("Booking", bookingSchema);