// This route is for customer only

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';

const router = express.Router();

// NOTE: The frontend makes two backend calls (in parallel) when a customer visits our home page of the website: get("/")  and  get("/packages")

// This route will be served in home page, search page, search page with filters to fetch our performers
router.get("/", defaultController.getAllPublicPerformers);
router.get("/packages", defaultController.getAllPublicPackages);

router.get("/performer/:id", defaultController.getPerformerById)

router.get("/package/:id", defaultController.getPackageById)

router.post("/book/:performerId", defaultController.bookPerformer)

router.post("/book/:packageId", defaultController.bookPerformer)

// Will be applicable for both package and performer booking
router.get("/booking/status", defaultController.getBookingStatus)


export default router;