import express from 'express';
import * as bookingController from '../controllers/booking.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

Handle this route properly in frontend, as you have to also deal with query params here 
// This route will be served with query params and below are the possble query params for this route
/**
 * Param	  Default	     Notes
   status	  all	         one of requested, confirmed, rejected, cancelled, completed
   page	1	  page         number
   limit	  50	         maximum 100
 */
router.get("/", verifyJWT, bookingController.getAllBookings)

router.post("/confirm/:bookingId", verifyJWT, bookingController.confirmBooking)

router.post("/reject/:bookingId", verifyJWT, bookingController.rejectBooking)

router.post("/reallot/:bookingId", verifyJWT, bookingController.reAllotBooking)

router.post("/final-amount/:bookingId", verifyJWT, bookingController.editFinalAmount);

router.post("/cancel/:bookingId", bookingController.cancelBooking);


export default router;