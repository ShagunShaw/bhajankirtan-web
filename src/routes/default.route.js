// This route is for customer only
There are some routes in this file, whose service we need not to make it separately we can just call that service from another service file like the 'performer service'

Also routes ka thoda conflict ho skta h between customer and admin accessible routes, so do check them out, and make sure koi do routes common na ho and also koi do routes ka prefix same na ho

Also jb app.js mei iss file ka prefix route likhogi, then make it as "/api/v1/default/" else yha kuch routes h, jo other routes a saath  conflicting ho skte h

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';

const router = express.Router();

NOTE: The frontend makes two backend calls (in parallel) when a customer visits our home page of the website: get("/")  and  get("/packages")

// This route will be served in home page, search page, search page with filters to fetch our performers
router.get("/", defaultController.getAllPublicPerformers);
router.get("/packages", defaultController.getAllPublicPackages);

router.get("/performer/:id", defaultController.getPerformerById)

router.get("/package/:id", defaultController.getPackageById)

router.post("/book/:performerId", defaultController.bookPerformer)

router.post("/book/:packageId", defaultController.bookPerformer)

Will be applicable for both package and performer booking
router.get("/booking/status", defaultController.getBookingStatus)


export default router;