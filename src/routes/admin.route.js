// This route is for admin only

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { getAllTags } from "../controllers/tag.controller.js";

const router = express.Router();

// This route is to be accessed only by me to just create the admin in the db, after that dont forget to comment out this route only (not its controllers and services) to prevent it from any misuse
router.post("/create-admin", adminController.createAdmin)

router.post("/login", adminController.adminLogin)

router.get("/dashboard", verifyJWT, adminController.dashboard)

router.post("/dashboard/markReconfirm/:bookingId", verifyJWT, adminController.markReconfirmed)

router.get("/tags", verifyJWT, getAllTags);

// Booking model mei yh sara enums h, ["requested", "confirmed", "rejected", "cancelled", "completed"], so baki sb toh ho jayega but for 'completed', the admin most probably will not bear to automatically mark 'completed' for any completed event or should be run a cron-job to automatically mark completed for those events whose scheduled date has been passed iff they are marked as 'confirmed'

router.post("/logout", verifyJWT, adminController.logout)


export default router;