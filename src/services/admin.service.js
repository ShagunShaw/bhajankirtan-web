import { Admin } from '../models/admin.model.js';
import { apiError } from '../utils/apiError.js';
import { generateAccessToken, generateRefreshToken } from '../middlewares/verifyJWT.js';


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