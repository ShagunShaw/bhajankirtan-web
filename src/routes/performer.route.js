import express from 'express';
import * as performerController from '../controllers/performer.controller';
import { verifyJWT } from '../middlewares/verifyJWT';

const router = express.Router();

Get this route done by claude itself, as it may contain some query params also, required for our search bar, along with Date, events, tags, visibility (those performers who are 'hidden' by the admin should not be displayed to the customer (same do this for package route also for the 'visibility' part)), etc.
router.get("/", verifyJWT, performerController.getAllPerformers)

router.get("/:performerId", verifyJWT, performerController.getPerformerById)

router.patch("/visibility/:performerId", verifyJWT, performerController.togglePerformerVisibility)

router.patch("/:performerId", verifyJWT, performerController.updatePerformer)

router.delete("/:performerId", verifyJWT, performerController.deletePerformer)

Yha pe bhi issue h for claude to fix, check its service file
router.post("/", verifyJWT, performerController.createPerformer);

export default router;