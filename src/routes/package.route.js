import express from 'express';
import * as packageController from '../controllers/package.controller.js';

const router = express.Router();

router.get("/", packageController.getAllPackages)

router.get("/:packageId", packageController.getPackageById)

router.post("/", packageController.createPackage)

router.patch("/:packageId", packageController.updatePackage)

router.delete("/:packageId", packageController.deletePackage)


export default router;