import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';

const router = express.Router();

Sort the response as 'non-confirmed' booking at the top, then the 'confirmed' bookings below it
router.get("/", bookingController.getAllBookings)

router.post("/confirm/:bookingId", bookingController.confirmBooking)

router.post("/reject/:bookingId", bookingController.rejectBooking)

Decide kro yh wala route kaha hoga, 'admin.route' mei ki 'booking.route' mei
router.post("/reallot/:bookingId", bookingController.reAllotBooking)


export default router;