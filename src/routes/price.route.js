import express from 'express';
import * as priceController from '../controllers/price.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { upload } from "../middlewares/multer.middleware.js"

const router = express.Router();

router.get("/", verifyJWT, priceController.getAllPrices)        // Checked

router.patch("/basePrice/:performerId", verifyJWT, upload.none(), priceController.updateBasePrice)      // Checked

router.patch("/peakPrice/:id", verifyJWT, upload.none(), priceController.updatePeakPrice)       // Checked

router.delete("/peakPrice/:id", verifyJWT, priceController.deletePeakPrice)         // Checked

router.post("/peakPrice", verifyJWT, upload.none(), priceController.createPeakPrice)        // Checked


export default router;