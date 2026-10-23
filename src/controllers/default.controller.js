import { apiResponse } from "../utils/apiResponse"
import { getPublicPerformerList } from "../services/default.service"


export const homePage = async (req, res) => {
    try {
        const data = await getPublicPerformerList(); // { performers, tags }

        res.set("Cache-Control", "public, max-age=600"); // browser reuses it for 10 minutes

        res.status(200).json(new apiResponse(200, data, "Performers fetched successfully"));
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