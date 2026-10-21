import express from 'express';
import * as priceController from '../controllers/price.controller.js';

const router = express.Router();

Ek baar have a look for the /pricing route coz i think uss page ka jo 3 subparts h, wo ek hi route k andar call hoga
router.get("/basePrice", priceController.getBasePricesOfAllPerformers)

router.patch("/basePrice/:performerId", priceController.updateBasePrice)

router.get("/peakPrice", priceController.getAllPeakPrice)

router.patch("/peakPrice/:id", priceController.updatePeakPrice)

router.delete("/peakPrice/:id", priceController.deletePeakPrice)

router.post("/peakPrice", priceController.createPeakPrice)


export default router;