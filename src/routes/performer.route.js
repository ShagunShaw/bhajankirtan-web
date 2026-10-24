import express from 'express';
import * as performerController from '../controllers/performer.controller';
import { verifyJWT } from '../middlewares/verifyJWT';

const router = express.Router();

// Yha pe sara performers at once share krr denge admin/customer ko (no server load as the data will be at max 40 - 50 KB), and for other filters like performer name, price, Tag, etc. yh sb frontend mei hi filter krr denge without making a second call to db. We will be storing the performers in browser cache for 5 min only for customer and not for admin, admin always sees the fresh data from db.
For Bookings, if admin wants a booking of a certain date/date_Range, performer, etc. then there will be another route called "/serach" with query params so that we can fetch it directly from the db
router.get("/", verifyJWT, performerController.getAllPerformers)

router.get("/:performerId", verifyJWT, performerController.getPerformerById)

router.patch("/visibility/:performerId", verifyJWT, performerController.togglePerformerVisibility)

Bina phtot and video k perfomer update kaise krli
router.patch("/:performerId", verifyJWT, performerController.updatePerformer)

performer delete krne k baad uska binary data cloudinary se bhi remove kro
router.delete("/:performerId", verifyJWT, performerController.deletePerformer)

Bina phtos and video upload k performer create kaise hogya
router.post("/", verifyJWT, performerController.createPerformer);

export default router;

At the very end, make this website, SEO friendly