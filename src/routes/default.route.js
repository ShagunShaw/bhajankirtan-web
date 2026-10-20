// This route is for customer only

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';

const router = express.Router();

router.get("/", defaultController.homePage)

This route can have two query params also-> category & q(name of the performer)
router.get("/performers", defaultController.getAllPerformers)

router.get("/performer/:id", defaultController.getPerformerById)

After requesting a booking for a performer, dont forget to send a reference id to the customer in the frontend, using this reference id only they will know the status of thier booking in future
router.post("/book/:performerId", defaultController.bookPerformer)

router.get("/booking/:ref", defaultController.getBookingStatus)


export default router;