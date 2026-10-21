import express from 'express';
import * as performerController from '../controllers/performer.controller.js';

const router = express.Router();

router.get("/", performerController.getAllPerformers)

router.get("/:performerId", performerController.getPerformerById)

router.patch("/visibility/:performerId", performerController.setPerformerVisibility)

router.patch("/:performerId", performerController.updatePerformer)

router.delete("/:performerId", performerController.deletePerformer)

router.post("/", performerController.createPerformer)