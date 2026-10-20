// This route is for customer only

import express from 'express';
import * as defaultController from '../controllers/default.controller.js';

const router = express.Router();

router.get("/", defaultController.homePage)

router.get("/search", defaultController.search)

export default router;