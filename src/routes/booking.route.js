import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

Sort the response as 'non-confirmed' booking at the top, then the 'confirmed' bookings below it
router.get("/", verifyJWT, bookingController.getAllBookings)

router.post("/confirm/:bookingId", verifyJWT, bookingController.confirmBooking)

router.post("/reject/:bookingId", verifyJWT, bookingController.rejectBooking)

Decide kro yh wala route kaha hoga, 'admin.route' mei ki 'booking.route' mei
router.post("/reallot/:bookingId", verifyJWT, bookingController.reAllotBooking)


export default router;