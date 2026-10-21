import express from 'express';
import * as priceController from '../controllers/price.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

Ek baar have a look for the /pricing route coz i think uss page ka jo 3 subparts h, wo ek hi route k andar call hoga
router.get("/basePrice", verifyJWT, priceController.getBasePricesOfAllPerformers)

router.patch("/basePrice/:performerId", verifyJWT, priceController.updateBasePrice)

router.get("/peakPrice", verifyJWT, priceController.getAllPeakPrice)

router.patch("/peakPrice/:id", verifyJWT, priceController.updatePeakPrice)

router.delete("/peakPrice/:id", verifyJWT, priceController.deletePeakPrice)

router.post("/peakPrice", verifyJWT, priceController.createPeakPrice)


export default router;