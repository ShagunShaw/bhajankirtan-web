import { getAllTagsForAdmin } from "../services/tag.service.js";
import { apiResponse } from "../utils/apiResponse.js";

export const getAllTags = async (req, res, next) => {
    try {
        const tags = await getAllTagsForAdmin();
        res.set("Cache-Control", "no-store"); // admin must always see the latest tags
        res.status(200).json(new apiResponse(200, tags, "Tags fetched successfully"));
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