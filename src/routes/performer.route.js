import express from 'express';
import * as performerController from '../controllers/performer.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { upload } from "../middlewares/multer.middleware.js"

const router = express.Router();

// Yha pe sara performers at once share krr denge admin/customer ko (no server load as the data will be at max 40 - 50 KB), and for other filters like performer name, price, Tag, etc. yh sb frontend mei hi filter krr denge without making a second call to db. We will be storing the performers in browser cache for 5 min only for customer and not for admin, admin always sees the fresh data from db.
// For Bookings, if admin wants a booking of a certain date/date_Range, performer, etc. then there will be another route called "/serach" with query params so that we can fetch it directly from the db
router.get("/", verifyJWT, performerController.getAllPerformers)    // Checked

router.get("/:performerId", verifyJWT, performerController.getPerformerById)        // Checked

router.patch("/visibility/:performerId", verifyJWT, performerController.togglePerformerVisibility)     // Checked

// In this route, all the photos and videos will be uploaded by the admin in req.files, and then will be uploaded on cloudinary from there (just as we did in our package route)
router.patch("/:performerId", verifyJWT, upload.any(), performerController.updatePerformer)       // Recheck after changes had been made to this route

// performer delete krne k baad uska corresponding photots and videos cloudinary se bhi remove kro (just as we did in our package route)
// Also performer delete krne k baad, uska jo corresponding tags th usko bhi count-- kro in the tags table, and if count of any tag has reached 0, then remove that tag properly
router.delete("/:performerId", verifyJWT, performerController.deletePerformer)      // Recheck after changes had been made to this route

// In this route, all the photos and videos, if there is any update in it, will be uploaded by the admin in req.files, and then will be uploaded on cloudinary from there (just as we did in our package route). 
// just like it created 'uploadPackageMedia' for package route, can it create something like this for the create and update performer route also, so that we can use something like 'uploadPackageMedia' instead of 'upload.any()' 
router.post("/", verifyJWT, upload.any(), performerController.createPerformer);     // Recheck after changes had been made to this route

export default router;