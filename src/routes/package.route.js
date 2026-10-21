import express from 'express';
import * as packageController from '../controllers/package.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';

const router = express.Router();

router.get("/", verifyJWT, packageController.getAllPackages)

router.get("/:packageId", verifyJWT, packageController.getPackageById)

router.post("/", verifyJWT, packageController.createPackage)

router.patch("/:packageId", verifyJWT, packageController.updatePackage)

router.delete("/:packageId", verifyJWT, packageController.deletePackage)


export default router;