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

/** BE CAUTIOUS with the below route, it has many query params in it:
Parameter	     Type	                  Default	              Purpose
fromDate	     YYYY-MM-DD	            undefined	            Filter bookings where eventDate >= fromDate.
toDate	       YYYY-MM-DD	            undefined	            Filter bookings where eventDate <= toDate.
performerId	   ObjectId string	      undefined	            Filter bookings requested for or allotted to a specific performer.
status	       string	                undefined	            Filter by status ("requested", "confirmed", "completed", "cancelled").
packageId	     ObjectId string	      undefined	            Filter bookings linked to a specific package.
page	         number	                1	                    Pagination page number.
limit	         number	                20	                  Number of bookings returned per page (max 100).
*/
router.get("/search", verifyJWT, bookingController.searchBookings);

export default router;