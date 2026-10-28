import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { upload } from '../middlewares/multer.middleware.js';

const router = express.Router();

// Handle this route properly in frontend, as you have to also deal with query params here 
// This route will be served with query params and below are the possble query params for this route
/**
 * Param	  Default	     Notes
   status	  all	         one of requested, confirmed, rejected, cancelled, completed
   page	1	  page         number
   limit	  50	         maximum 100
 */
router.get("/", verifyJWT, bookingController.getAllBookings)    // Checked

// Be more cautious while using this route for a package confirmation, specially when designing its frontend
// For a package confimation part, the admin has to manually allot some perfomers to confirm the package request, now suppose if we allot a performer to this package unknowingly that the performer has bookings on that date for another event, so we have designed the backend such that it will notify the admi that the perfomer has already a previous booking for that date like this: "Performer 1 is already booked for BK-634733OEL at 19:00 on 2026-11-24. Send ignoreConflicts: true to allot anyway". If we want to ignore this explicitly then set, 'ignoreConflicts: true' in req.body
router.post("/confirm/:bookingId", verifyJWT, upload.none(), bookingController.confirmBooking)    // Checked

router.post("/reject/:bookingId", verifyJWT, bookingController.rejectBooking)       // Checked

router.post("/reallot/:bookingId", verifyJWT, upload.none(), bookingController.reAllotBooking)      // Initially this route worked, but something messed up in postman while testing, so re-check this route creating a whole new 'solo' booking (also check if it works for 'package' booking or not, if yes, then how)

router.post("/final-amount/:bookingId", verifyJWT, upload.none(), bookingController.editFinalAmount);     // Checked

router.post("/cancel/:bookingId", verifyJWT, upload.none(), bookingController.cancelBooking);     // Checked

// For Bookings, if admin wants a booking of a certain date/date_Range, performer, etc. then there will be another route called "/serach" with query params so that we can fetch it directly from the db. But again, later we will set up a cron job (not now), in this, where 'completed' bookings of more than a month will be automatically deleted from the db, so instead of howing the admin, "booking not found", we have to display a proper mssg "bookings before this date: <date> has been removed from the db"

export default router;