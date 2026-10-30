import mongoose from "mongoose";
import { Admin } from '../models/admin.model.js';
import { apiError } from '../utils/apiError.js';
import { generateAccessToken, generateRefreshToken } from '../middlewares/verifyJWT.js';
import { Booking } from "../models/Booking.model.js";
import { istDate } from "../utils/dates.js";


const CARD_FIELDS =
    "referenceId customerName phone bookingType packageName eventType eventDate eventTime eventAddress additionalNote status finalAmount allotments markedReconfirmed";

const toCard = (b) => ({
    bookingId: b._id,
    referenceId: b.referenceId,
    customerName: b.customerName,
    phone: b.phone,
    eventType: b.eventType,
    bookingType: b.bookingType,
    packageName: b.packageName,
    eventType: b.eventType,
    eventDate: b.eventDate,
    eventTime: b.eventTime,
    eventAddress: b.eventAddress,
    additionalNote: b.additionalNote,
    status: b.status,
    finalAmount: b.finalAmount,
    reconfirmed: b.markedReconfirmed,
    allotments: b.allotments
        .filter((a) => a.status === "assigned")
        .map((a) => ({
            allotmentId: a._id,
            performerId: a.performer?._id,
            performerName: a.performer?.fullName,
            role: a.role
        }))
});

const fetchBookings = (date) =>
    Booking.find({ status: { $nin: ["rejected", "cancelled"] }, eventDate: date })
        .select(CARD_FIELDS)
        .populate("allotments.performer", "fullName")
        .sort({ eventTime: 1 })
        .lean();


export const createAdminService = async ({ username, password, email, fullName }) => {
    try {
        if (!username || !password || !email || !fullName) {
            throw new apiError(400, "ValidationError", "username, password, email and fullName are all required")
        }

        // unique index on username/email handles duplicates
        const admin = await Admin.create({ username, password, email, fullName })

        if (!admin) {
            throw new apiError(500, "DatabaseError", "Admin creation failed at the database level, please try again")
        }

        const adminData = admin.toObject()
        delete adminData.password
        delete adminData.refreshToken

        return adminData;
    } catch (error) {
        if (error instanceof apiError) throw error

        // MongoDB duplicate key error
        if (error.code === 11000) {
            const conflictField = Object.keys(error.keyPattern)[0]  // "username" or "email"
            throw new apiError(409, "ConflictError", `An admin with this ${conflictField} already exists`)
        }

        if (error.name === "ValidationError") {
            const firstMessage = Object.values(error.errors)[0]?.message
            throw new apiError(400, "ValidationError", firstMessage || "Invalid data provided")
        }

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        )
    }
}

export const adminLoginService = async ({ username, email, password }) => {
    try {
        if ((!username && !email) || !password) {
            throw new apiError(400, "ValidationError", "Password and either username or email are required")
        }

        const query = username ? { username } : { email }
        const admin = await Admin.findOne(query)

        if (!admin) {
            throw new apiError(404, "NotFound", "No admin found with the provided credentials")
        }

        const isMatch = await admin.isPasswordCorrect(password)
        if (!isMatch) {
            throw new apiError(401, "Unauthorized", "Incorrect password")
        }

        const accessToken = generateAccessToken(admin._id, admin.username, admin.email)
        const refreshToken = generateRefreshToken(admin._id)

        admin.refreshToken = refreshToken
        await admin.save({ validateBeforeSave: false })

        const adminData = admin.toObject()
        delete adminData.password
        delete adminData.refreshToken

        return { adminData, accessToken, refreshToken }
    } catch (error) {
        if (error instanceof apiError) throw error

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        )
    }
}

export const dashBoardService = async () => {
    try {
        const today = istDate(0);
        const tomorrow = istDate(1);

        const [totalUpcoming, upcomingPending, upcomingConfirmed, todayDocs, tomorrowDocs] = await Promise.all([
            Booking.countDocuments({ eventDate: { $gte: today }, status: { $nin: ["rejected", "cancelled"] } }),
            Booking.countDocuments({ eventDate: { $gte: today }, status: "requested" }),
            Booking.countDocuments({ status: "confirmed", eventDate: { $gte: today } }),
            fetchBookings(today),
            fetchBookings(tomorrow)
        ]);

        return {
            counts: { totalUpcoming, upcomingPending, upcomingConfirmed },
            today: todayDocs.map(toCard),
            tomorrow: tomorrowDocs.map(toCard)
        };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const markReconfirmedService = async (bookingId) => {
    try {
        if (!mongoose.isValidObjectId(bookingId)) throw new apiError(400, "Invalid ID", "The provided booking ID is invalid");

        const updated = await Booking.findOneAndUpdate(
            {
                _id: bookingId,
                status: "confirmed",
                markedReconfirmed: false,
                eventDate: { $gte: istDate(0) }
            },
            { $set: { markedReconfirmed: true } },
            { new: true }
        );
        if (updated) return updated;

        // Below is the fallback diagnostic check to figure out why the update failed so we can return a specific, meaningful HTTP error to the client.
        const booking = await Booking.findById(bookingId).select("markedReconfirmed").lean();

        if (booking?.markedReconfirmed) throw new apiError(409, "Already marked as reconfirmed", "This booking ID had been previously been marked reconfirmed by the admin");

        throw new apiError(404, "Cannot reconfirm", "Booking not found, not confirmed, or already past");
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}

export const adminLogoutService = async (adminId) => {
    try {
        const response = await Admin.findByIdAndUpdate(
            adminId,
            {
                $set: {
                    refreshToken: null
                }
            },
            {
                new: true
            }
        )

        if (!response) {
            throw new apiError(404, "NotFoundError", "Admin account not found");
        }

        return response;
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
}