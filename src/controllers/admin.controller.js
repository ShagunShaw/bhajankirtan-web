import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { createAdminService, adminLoginService, adminLogoutService, dashBoardService, markReconfirmedService } from "../services/admin.service.js";


export const createAdmin = async (req, res) => {
    try {
        const { username, password, email, fullName } = req.body

        const admin = await createAdminService({ username, password, email, fullName })

        return res.status(201).json(
            new apiResponse(201, admin, "Admin created successfully")
        )
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const adminLogin = async (req, res) => {
    try {
        const { username, email, password } = req.body

        const { adminData, accessToken, refreshToken } = await adminLoginService({ username, email, password })

        const isProduction = process.env.NODE_ENV === 'production'

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,         // true in prod (HTTPS only), false in dev (allows HTTP)
            sameSite: isProduction ? 'strict' : 'lax'   // strict in prod (CSRF protection), lax in dev
        }

        return res
            .status(200)
            .cookie('accessToken', accessToken, cookieOptions)
            .cookie('refreshToken', refreshToken, cookieOptions)
            .json(new apiResponse(200, adminData, "Logged in successfully"))
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const dashboard = async (req, res) => {
    try {
        const data = await dashBoardService(); // { counts, today, tomorrow }

        res.status(200)
            .json(new apiResponse(200, data, "Admin Dashboard fetched successfully!"))
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const markReconfirmed = async (req, res) => {
    try {
        const { bookingId } = req.params;

        const updated = await markReconfirmedService(bookingId);

        return res.status(200).json(new apiResponse(200, {
            _id: updated._id,
            referenceId: updated.referenceId,
            markedReconfirmed: updated.markedReconfirmed
        }, "The booking has been marked reconfirmed!"))
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}

export const logout = async (req, res) => {
    try {
        const response = await adminLogoutService(req.user._id);

        const isProduction = process.env.NODE_ENV === "production";

        const cookieOptions = {
            httpOnly: true,
            secure: isProduction,         // true in prod (HTTPS only), false in dev (allows HTTP)
            sameSite: isProduction ? 'strict' : 'lax'   // strict in prod (CSRF protection), lax in dev
        }

        return res.status(200)
            .clearCookie("accessToken", cookieOptions)
            .clearCookie("refreshToken", cookieOptions)
            .json(new apiResponse(200, {}, "User Logged Out Successfully"))
    } catch (error) {
        if (error instanceof apiError) {
            return res.status(error.status).json(error);
        }

        const status = error.status ?? 500;
        const errName = error.errName ?? error.name ?? "InternalServerError";
        const errMessage = error.errMessage ?? error.message ?? "An unexpected error occurred";

        return res.status(status).json(
            new apiError(status, errName, errMessage)
        );
    }
}