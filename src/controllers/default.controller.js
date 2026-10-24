import { apiResponse } from "../utils/apiResponse.js";
import { apiError } from "../utils/apiError.js";
import * as defaultService from "../services/default.service.js";

export const getAllPublicPerformers = async (req, res) => {
    try {
        const data = await defaultService.getPublicPerformerList(); // { performers, tags }

        res.set("Cache-Control", "public, max-age=600"); // browser reuses it for 10 minutes

        return res.status(200).json(new apiResponse(200, data, "Performers fetched successfully"));
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
};

export const getAllPublicPackages = async (req, res) => {
    try {
        const packages = await defaultService.getPublicPackageList();

        res.set("Cache-Control", "public, max-age=600");

        return res.status(200).json(
            new apiResponse(200, packages, "Public packages fetched successfully")
        );
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
};

export const getPerformerById = async (req, res) => {
    try {
        const { id } = req.params;

        const performer = await defaultService.getPublicPerformerById(id);

        return res.status(200).json(
            new apiResponse(200, performer, "Performer details fetched successfully")
        );
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
};

export const getPackageById = async (req, res) => {
    try {
        const { id } = req.params;

        const pkg = await defaultService.getPublicPackageById(id);

        return res.status(200).json(
            new apiResponse(200, pkg, "Package details fetched successfully")
        );
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
};

export const bookPerformer = async (req, res) => {
    try {
        const { performerId } = req.params;

        const booking = await defaultService.bookPerformerService(performerId, req.body);

        return res.status(201).json(
            new apiResponse(201, booking, "Booking request submitted successfully")
        );
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
};

export const bookPackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const booking = await defaultService.bookPackageService(packageId, req.body);

        return res.status(201).json(
            new apiResponse(201, booking, "Package booking request submitted successfully")
        );
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
};

export const getBookingStatus = async (req, res) => {
    try {
        const { refId } = req.body;

        const booking = await defaultService.getBookingStatusService(refId);

        return res.status(200).json(
            new apiResponse(200, booking, "Booking status retrieved successfully")
        );
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
};