import { Tag, normalizeTag } from "../models/tags.model.js";
import { apiError } from "../utils/apiError.js";

const MAX_TAGS = 10;

// Accepts an array of names, a JSON string, or a comma-separated string.
// Returns [[normalizedName, displayName], ...] with duplicates removed.
const parseTags = (input) => {
  let raw = input;
  if (typeof raw === "string") {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) raw = parsed;
    } catch {
      // not a JSON string, fall through to comma-separated split
    }
  }
  raw = Array.isArray(raw) ? raw : typeof raw === "string" ? raw.split(",") : null;
  if (!raw) throw new apiError(400, "Validation Error", "Tags must be a list of tag names");

  const seen = new Map();
  for (const item of raw) {
    if (typeof item !== "string") throw new apiError(400, "Validation Error", "Each tag must be text");
    const name = normalizeTag(item);
    if (!name) continue;
    if (name.length < 2 || name.length > 40) {
      throw new apiError(400, "Invalid Tag", `Tag "${item}" must be 2 to 40 characters`);
    }
    if (!seen.has(name)) seen.set(name, item.trim());
  }

  if (seen.size > MAX_TAGS) {
    throw new apiError(400, "Validation Error", `A performer can have at most ${MAX_TAGS} tags`);
  }
  return [...seen.entries()];
};

const getOrCreateTag = async (name, displayName) => {
  try {
    return await Tag.findOneAndUpdate(
      { name },
      { $setOnInsert: { displayName, count: 0 } },
      { upsert: true, new: true }
    );
  } catch (err) {
    if (err.code === 11000) return Tag.findOne({ name }); // created by another request at the same moment
    throw err;
  }
};

// Returns the tag ids to store on the performer
export const resolveTagIds = async (input) => {
  try {
    const entries = parseTags(input); // validates everything before any tag is created

    const tags = await Promise.all(entries.map(([name, display]) => getOrCreateTag(name, display)));
    
    return tags.map((t) => t._id);
  } catch (error) {
    if (error instanceof apiError) throw error;

    throw new apiError(
      500,
      error.name || "InternalServerError",
      error.message || "An unexpected error occurred"
    );
  }
};

// Increment count for tags associated with a performer
export const incrementTagCounts = async (tagIds = []) => {
  try {
    if (!tagIds || tagIds.length === 0) return;
    await Tag.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { count: 1 } }
    );
  } catch (error) {
    console.error("Error incrementing tag counts:", error);
  }
};

// Decrement count for tags and remove tags whose count reaches 0 or less
export const decrementTagCounts = async (tagIds = []) => {
  try {
    if (!tagIds || tagIds.length === 0) return;
    await Tag.updateMany(
      { _id: { $in: tagIds } },
      { $inc: { count: -1 } }
    );
    await Tag.deleteMany({
      _id: { $in: tagIds },
      count: { $lte: 0 }
    });
  } catch (error) {
    console.error("Error decrementing tag counts:", error);
  }
};

export const getAllTagsForAdmin = async (input) => {
  try {
    const tags = await Tag.find().select("name displayName count").sort({ name: 1 }).lean();

    return tags;
  } catch (error) {
    if (error instanceof apiError) throw error;

    throw new apiError(
      500,
      error.name || "InternalServerError",
      error.message || "An unexpected error occurred"
    );
  }
};