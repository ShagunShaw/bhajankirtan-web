// This route is for customer only

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';
import { upload } from "../middlewares/multer.middleware.js"

const router = express.Router();

// NOTE: The frontend makes two backend calls (in parallel) when a customer visits our home page of the website: get("/")  and  get("/packages")

// This route will be served in home page, search page, search page with filters to fetch our performers
router.get("/", defaultController.getAllPublicPerformers);      // Checked
router.get("/packages", defaultController.getAllPublicPackages);        // Checked

router.get("/performer/:id", defaultController.getPerformerById)        // Checked

router.get("/package/:id", defaultController.getPackageById)        // Checked

router.post("/book/performer/:performerId", upload.none(), defaultController.bookPerformer)     // Checked

router.post("/book/package/:packageId", upload.none(), defaultController.bookPackage)       // Checked

// Will be applicable for both package and performer booking
router.get("/booking/status", upload.none(), defaultController.getBookingStatus)        // Checked


export default router;