import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import { createAdminService, adminLoginService, adminLogoutService } from "../services/admin.service.js";


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

export const getAllEvents = async (req, res) => {      // This will contain all today's and tommorow's event along with the booking count
    try {

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