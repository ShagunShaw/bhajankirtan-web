import { Performer } from "../models/performer.model"


const tagNames = (tags = []) => tags.filter(Boolean).map((t) => t.displayName || t.name);

/* ---------- Customer: visible performers + their upcoming peak periods + tag list ---------- */
export const getPublicPerformerList = async () => {
    try {
        const performers = await Performer.find({ visibility: "visible" })
            .select("fullName basePrice profilePhoto experience tags")
            .populate("tags", "name displayName")
            .sort({ fullName: 1 })
            .lean();

        // One query for all peak periods that haven't ended yet (dates are "YYYY-MM-DD" strings).
        const peaks = await PeakPrice.find({
            performer: { $in: performers.map((p) => p._id) },
            to: { $gte: istDate(0) }
        })
            .select("performer from to peakPrice label")
            .sort({ from: 1 })
            .lean();

        const peaksByPerformer = new Map();
        for (const pk of peaks) {
            const key = String(pk.performer);
            if (!peaksByPerformer.has(key)) peaksByPerformer.set(key, []);
            peaksByPerformer.get(key).push({ from: pk.from, to: pk.to, price: pk.peakPrice, label: pk.label });
        }

        // Tag suggestions come from the same list, so only tags with a visible performer appear.
        const tagCounts = new Map();
        const list = performers.map((p) => {
            const tags = tagNames(p.tags);
            tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1));
            return {
                id: p._id,
                fullName: p.fullName,
                basePrice: p.basePrice,
                profilePhoto: p.profilePhoto,
                experience: p.experience,
                tags,
                peakPeriods: peaksByPerformer.get(String(p._id)) || []
            };
        });

        const tags = [...tagCounts.entries()]
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        return { performers: list, tags };
    } catch (error) {
        if (error instanceof apiError) throw error;

        throw new apiError(
            500,
            error.name || "InternalServerError",
            error.message || "An unexpected error occurred"
        );
    }
};