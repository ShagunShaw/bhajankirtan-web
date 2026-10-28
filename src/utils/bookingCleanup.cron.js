import cron from "node-cron";
import { Booking } from "../models/booking.model.js";
import { Log } from "../models/log.model.js";


/**
 * Initializes the booking cleanup cron job.
 * Runs every day at midnight (00:00).
 * Cron schedule format: (minute hour day month day-of-week)
 */
export const initBookingCleanupCron = () => {
    // Runs daily at 00:00 (midnight)
    cron.schedule("0 0 * * *", async () => {
        try {
            console.log("[Cron Job] Running completed booking cleanup...");

            // Configurable retention window (e.g. 30 days; change to 7 for a week, 1 for a day)
            const RETENTION_DAYS = 45;

            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - RETENTION_DAYS);
            // Optional: reset time to start of that day (00:00:00.000)
            cutoffDate.setHours(0, 0, 0, 0);

            // Delete completed bookings older than the cutoff date
            const result = await Booking.deleteMany({
                eventDate: { $lt: cutoffDate }
            });

            // Upsert the single row in Log collection
            await Log.findOneAndUpdate(
                { key: "booking_cleanup" },
                { $set: { lastCleanedUpBeforeDate: cutoffDate } },
                { upsert: true, new: true }
            );

            console.log(
                `[Cron Job] Cleanup completed: ${result.deletedCount} bookings deleted. Cutoff date set to ${cutoffDate.toISOString().split("T")[0]}`
            );
        } catch (error) {
            console.error("[Cron Job] Error during booking cleanup:", error.message);
        }
    });
};