import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import * as priceService from "../services/price.service.js";

export const getAllPrices = async (req, res) => {
    try {
        const pricingData = await priceService.getAllPricesService();

        return res.status(200).json(
            new apiResponse(200, pricingData, "Pricing details fetched successfully")
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

export const updateBasePrice = async (req, res) => {
    try {
        const { performerId } = req.params;
        const { basePrice } = req.body;

        const updated = await priceService.updateBasePriceService(performerId, basePrice);

        return res.status(200).json(
            new apiResponse(200, updated, `Base price for ${updated.performer} updated successfully`)
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

export const createPeakPrice = async (req, res) => {
    try {
        const { performer, label, from, to, peakPrice } = req.body;

        const created = await priceService.createPeakPriceService({
            performer,
            label,
            from,
            to,
            peakPrice
        });

        return res.status(201).json(
            new apiResponse(201, created, "Peak price created successfully")
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

export const updatePeakPrice = async (req, res) => {
    try {
        const { id } = req.params;
        const { label, from, to, peakPrice } = req.body;

        const updated = await priceService.updatePeakPriceService(id, {
            label,
            from,
            to,
            peakPrice
        });

        return res.status(200).json(
            new apiResponse(200, updated, "Peak price updated successfully")
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

export const deletePeakPrice = async (req, res) => {
    try {
        const { id } = req.params;

        const deleted = await priceService.deletePeakPriceService(id);

        return res.status(200).json(
            new apiResponse(200, deleted, "Peak price deleted successfully")
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