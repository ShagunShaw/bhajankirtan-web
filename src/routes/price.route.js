import express from 'express';
import * as priceController from '../controllers/price.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

router.get("/", verifyJWT, priceController.getAllPrices)

router.patch("/basePrice/:performerId", verifyJWT, priceController.updateBasePrice)

router.patch("/peakPrice/:id", verifyJWT, priceController.updatePeakPrice)

router.delete("/peakPrice/:id", verifyJWT, priceController.deletePeakPrice)

router.post("/peakPrice", verifyJWT, priceController.createPeakPrice)


export default router;