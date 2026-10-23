import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import * as packageService from "../services/package.service.js";

export const getAllPackages = async (req, res) => {
    try {
        const packages = await packageService.getAllPackagesService(req.query);

        return res.status(200).json(
            new apiResponse(200, packages, "Packages fetched successfully")
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
        const { packageId } = req.params;

        const pkg = await packageService.getPackageByIdService(packageId);

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

export const createPackage = async (req, res) => {
    try {
        const pkg = await packageService.createPackageService(req.body, req.files);

        return res.status(201).json(
            new apiResponse(201, pkg, "Package created successfully")
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

export const updatePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const updated = await packageService.updatePackageService(packageId, req.body, req.files);

        return res.status(200).json(
            new apiResponse(200, updated, "Package updated successfully")
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

export const togglePackageVisibility = async (req, res) => {
    try {
        const { packageId } = req.params;

        const result = await packageService.togglePackageVisibilityService(packageId);

        return res.status(200).json(
            new apiResponse(200, result, `Package visibility changed to '${result.visibility}'`)
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

export const deletePackage = async (req, res) => {
    try {
        const { packageId } = req.params;

        const result = await packageService.deletePackageService(packageId);

        return res.status(200).json(
            new apiResponse(200, result, `Package '${result.packageName}' deleted successfully`)
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
