// This route is for admin only
saare routes pe 'verifyJWT' middleware lagana baki h, except login and createAdmin and customers route

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

This route is to be accessed only by me to just create the admin in the db, after that dont forget to comment out this route only (not its controllers and services) to prevent it from any misuse
router.post("/create-admin", adminController.createAdmin)

router.post("/login", adminController.login)

Check once i think yh dashboard wala page mei jo 2 subparts h wo ek hi route mei call hoga, also you need to make a logic for getting the COUNT of 'total booking', 'pending request', 'upcoming confirmed' to be displayed in admin dashboard
router.get("/dashboard/todayEvent", adminController.getAllTodayEvent)

router.get("/dashboard/tommorowEvent", adminController.getAllTommorowEvent)

router.post("/dashboard/markReconfirm/:id", adminController.markReconfirmed)

Re-allotment ka bhi ek route banega, now you decide wo route 'booking.route.js' mei hoga ki 'admin.route.js' mei

router.post("/logout", adminController.logout)


export default router;