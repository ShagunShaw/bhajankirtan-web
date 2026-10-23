import { apiError } from "../utils/apiError.js";
import { apiResponse } from "../utils/apiResponse.js";
import * as performerService from "../services/performer.service.js";

export const getAllPerformers = async (req, res) => {
    try {
        const performers = await performerService.getAllPerformersService();

        res.set("Cache-Control", "no-store"); // admin always sees fresh data

        res.status(200).json(new apiResponse(200, performers, "All Performers fetched successfully"));
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
        const { performerId } = req.params;

        const performer = await performerService.getPerformerByIdService(performerId);

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

export const createPerformer = async (req, res) => {
    try {
        const performer = await performerService.createPerformerService(req.body);

        return res.status(201).json(
            new apiResponse(201, performer, "Performer created successfully")
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

export const updatePerformer = async (req, res) => {
    try {
        const { performerId } = req.params;

        const updated = await performerService.updatePerformerService(performerId, req.body);

        return res.status(200).json(
            new apiResponse(200, updated, "Performer updated successfully")
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

export const togglePerformerVisibility = async (req, res) => {
    try {
        const { performerId } = req.params;

        const result = await performerService.togglePerformerVisibilityService(performerId);

        return res.status(200).json(
            new apiResponse(200, result, `Performer visibility changed to '${result.visibility}'`)
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

export const deletePerformer = async (req, res) => {
    try {
        const { performerId } = req.params;

        const result = await performerService.deletePerformerService(performerId);

        return res.status(200).json(
            new apiResponse(200, result, `Performer ${result.fullName} deleted successfully`)
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


The flow:

1) When the admin clicks the 'add' or 'edit' performer form, the page fetches the full tag list once (a few KB, even with hundreds of tags).
2) As the admin types “chowki”, the frontend finds tags that contain it (using the same lowercase and trim rule) and shows “mata ki chowki” as a suggestion.
3) The admin clicks the suggestion to reuse it, or just keeps typing to create a new tag.
4) On save, the frontend sends the tag names, and the backend reuses or creates each one with the resolveTagIds code from earlier.