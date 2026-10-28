import express from 'express';
import * as performerController from '../controllers/performer.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { uploadPerformerMedia } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Yha pe sara performers at once share krr denge admin/customer ko (no server load as the data will be at max 40 - 50 KB), and for other filters like performer name, price, Tag, etc. yh sb frontend mei hi filter krr denge without making a second call to db. We will be storing the performers in browser cache for 5 min only for customer and not for admin, admin always sees the fresh data from db.
router.get("/", verifyJWT, performerController.getAllPerformers);    // Checked

router.get("/:performerId", verifyJWT, performerController.getPerformerById);        // Checked

router.patch("/visibility/:performerId", verifyJWT, performerController.togglePerformerVisibility);     // Checked

// Check once ki yh textual data toh properly update krra h, but for binary data, wo properly update hora h ki ni
router.patch("/:performerId", verifyJWT, uploadPerformerMedia, performerController.updatePerformer);       

router.delete("/:performerId", verifyJWT, performerController.deletePerformer);      

router.post("/", verifyJWT, uploadPerformerMedia, performerController.createPerformer);    

export default router;