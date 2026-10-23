// This route is for customer only
There are some routes in this file, whose service we need not to make it separately we can just call that service from another service file like the 'performer service'

Also routes ka thoda conflict ho skta h between customer and admin accessible routes, so do check them out, and make sure koi do routes common na ho and also koi do routes ka prefix same na ho

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';

const router = express.Router();

// This route will be served in home page, search page, search page with filters to fetch our performers
One second, but in our home page only we will be fetching the 'packages' also and this is to be displayed towards the end of the page. So decide, 'packages' home page mei hi show krna h, or you will have a dedicated route/page in frontend. If in home page, then fetch the packages under this route only. If in a separate section/page in frontend, then make another route, controller & services for it
router.get("/", defaultController.homePage)

router.get("/performer/:id", defaultController.getPerformerById)

After requesting a booking for a performer, dont forget to send a reference id to the customer in the frontend, using this reference id only they will know the status of thier booking in future
router.post("/book/:performerId", defaultController.bookPerformer)

router.get("/booking/:ref", defaultController.getBookingStatus)


export default router;