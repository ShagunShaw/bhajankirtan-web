// This route is for admin only
saare routes pe 'verifyJWT' middleware lagana baki h, except login and createAdmin and customers route

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js'

const router = express.Router();

This route is to be accessed only by me to just create the admin in the db, after that dont forget to comment out this route only (not its controllers and services) to prevent it from any misuse
router.post("/create-admin", adminController.createAdmin)

router.post("/login", adminController.adminLogin)

router.get("/dashboard", verifyJWT, adminController.dashboard)

router.post("/dashboard/markReconfirm/:bookingId/:allotmentId", verifyJWT, adminController.markReconfirmed)

Re-allotment ka bhi ek route banega, now you decide wo route 'booking.route.js' mei hoga ki 'admin.route.js' mei

router.post("/logout", verifyJWT, adminController.logout)


export default router;