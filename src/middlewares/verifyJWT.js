import jwt from 'jsonwebtoken'
import { apiError } from "../utils/apiError"
import { Admin } from '../models/admin.model'

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY


if (!ACCESS_TOKEN_SECRET || !ACCESS_TOKEN_EXPIRY || !REFRESH_TOKEN_SECRET || !REFRESH_TOKEN_EXPIRY)
    throw new Error("One of the access token secret/expiry or refresh token secret/expiry is missing")


export const generateAccessToken = (_id, username, email) => {
    const payload = { _id, username, email }
    return jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRY,
        algorithm: 'HS256'
    })
}

export const generateRefreshToken = (_id) => {
    const payload = { _id }
    return jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRY,
        algorithm: 'HS256'
    })
}


export const verifyJWT = (req, res, next) => {
    const token = req.cookies?.accessToken || req.headers['authorization']?.split(' ')[1]

    if (!token) {
        return res.status(401).json(new apiError(401, "Unauthorised Access", "You must be logged in to access this route"))
    }

    try {
        const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET)
        req.user = decoded
        return next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return verifyRefreshToken(req, res, next) // ✅ IMPORTANT RETURN
        }
        return res.status(401).json(new apiError(401, "Unknown Error", err.message))
    }
}

const verifyRefreshToken = async (req, res, next) => {
    const token = req.cookies?.refreshToken

    if (!token) {
        return res.status(401).json(new apiError(401, "Token Not Found", "Refresh Token not found"))
    }

    try {
        const decoded = jwt.verify(token, REFRESH_TOKEN_SECRET)

        if (!decoded) {
            return res.status(500).json(new apiError(401, "Payload Found", "Payload not found from refresh token"))
        }

        const user= await Admin.findById(decoded._id)
                               .select("_id username email")

        if (!user) return res.status(404).json(new apiError(404, "Not Found", "Admin not found"))

        const accessToken = generateAccessToken(user._id, user.username, user.email)
        req.user = user

        res.cookie('accessToken', accessToken, {
            httpOnly: true,
            secure: true
        })      // will overwrite the previous expired access token

        return next();
    } catch (err) {
        if (err.name === "TokenExpiredError") {
            return res.status(401).json(new apiError(401, "Token Expired", "Refresh Token expired, login again"))
        }
        return res.status(401).json(new apiError(401, "Unknown Error", err.message))
    }
}