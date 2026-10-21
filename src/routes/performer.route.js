import express from 'express';
import * as performerController from '../controllers/performer.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

router.get("/", verifyJWT, performerController.getAllPerformers)

router.get("/:performerId", verifyJWT, performerController.getPerformerById)

router.patch("/visibility/:performerId", verifyJWT, performerController.setPerformerVisibility)

router.patch("/:performerId", verifyJWT, performerController.updatePerformer)

router.delete("/:performerId", verifyJWT, performerController.deletePerformer)

router.post("/", verifyJWT, performerController.createPerformer)