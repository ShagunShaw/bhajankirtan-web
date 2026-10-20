// This route is for admin only
admin k saare routes pe 'verifyJWT' middleware lagana baki h, except login and createAdmin

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

This route is to be accessed only by me to just create the admin in the db, after that dont forget to comment out this route only (not its controllers and services) to prevent it from any misuse
router.post("/create-admin", adminController.createAdmin)

router.post("/login", adminController.login)

Check once i think yh dashboard wala page mei jo 2 subparts h wo ek hi route mei call hoga
router.get("/todayEvent", adminController.getAllTodayEvent)

router.get("/tommorowEvent", adminController.getAllTommorowEvent)

router.post("/markReconfirm/:id", adminController.markReconfirmed)

Sort the response as 'non-confirmed' booking at the top, then the 'confirmed' bookings below it
router.get("/bookings", adminController.getAllBookings)

router.post("/confirm-booking/:bookingId", adminController.confirmBooking)

router.post("/reject-booking/:bookingId", adminController.rejectBooking)

router.post("/re-allot-booking/:bookingId", adminController.reAllotBooking)

router.get("/performers", adminController.getAllPerformers)

router.get("/performers/:performerId", adminController.getPerformerById)

router.patch("/performerVisibility/:performerId", adminController.setPerformerVisibility)

router.patch("/performer/:performerId", adminController.updatePerformer)

router.delete("/performer/:performerId", adminController.deletePerformer)

router.post("/performer", adminController.createPerformer)

router.get("/packages", adminController.getAllPackages)

router.get("/packages/:packageId", adminController.getPackageById)

router.post("package", adminController.createPackage)

router.patch("package/:packageId", adminController.updatePackage)

router.delete("package/:packageId", adminController.deletePackage)


Ek baar have a look for the /pricing route coz i think uss page ka jo 3 subparts h, wo ek hi route k andar call hoga
router.get("/basePrice", adminController.getBasePricesOfAllPerformers)

router.patch("/basePrice/:performerId", adminController.updateBasePrice)

router.get("/peakPrice", adminController.getAllPeakPrice)

router.patch("/peakPrice/:id", adminController.updatePeakPrice)

router.delete("/peakPrice/:id", adminController.deletePeakPrice)

router.post("/peakPrice", adminController.createPeakPrice)

router.post("/logout", adminController.logout)

export default router;