import express from 'express';
import * as performerController from '../controllers/performer.controller';
import { verifyJWT } from '../middlewares/verifyJWT';
import { Tag } from '../models/tags.model';

const router = express.Router();

Yha pe sara performers at once share krr denge admin ko (no server load as the data will be at max 40 - 50 KB), and for other filters like performer name, price, Tag, etc. yh sb frontend mei hi filter krr denge without making a second call to db. We will be storing the performers in browser cache for 5 min only for customer and not for admin, admin always sees the fresh data from db.
Dont forget to add the 'Export as Excel' option in the frontedn to enable admin to download all the performers details at once from the website itself
Since our all perfomer list will be at max 40 - 50 KB, so I am thinking to use this same service to render our performers to the customers as well and they can filter out thier use case according to their need
For Bookings, since the list can grow over time, we need to set pagination while fetching 'getAllBookings', and if admin wants a booking of a certain date/ date Range, performer, etc. then there will be another route called "/serach" with query params so that we can fetch it directly from the db
router.get("/", verifyJWT, performerController.getAllPerformers)

router.get("/:performerId", verifyJWT, performerController.getPerformerById)

router.patch("/visibility/:performerId", verifyJWT, performerController.togglePerformerVisibility)

router.patch("/:performerId", verifyJWT, performerController.updatePerformer)

router.delete("/:performerId", verifyJWT, performerController.deletePerformer)

Yha pe bhi issue h for claude to fix, check its service file
router.post("/", verifyJWT, performerController.createPerformer);

export default router;

At the very end, make this website, SEO friendly