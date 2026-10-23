import express from 'express';
import * as packageController from '../controllers/package.controller.js';
import { verifyJWT } from '../middlewares/verifyJWT.js';
import { uploadPackageMedia } from '../middlewares/multer.middleware.js';

const router = express.Router();

// We CAN apply query parms in this route like: /?visibility=hidden   or   ?visibility=visible
router.get("/", verifyJWT, packageController.getAllPackages);

router.get("/:packageId", verifyJWT, packageController.getPackageById);

router.post("/", verifyJWT, uploadPackageMedia, packageController.createPackage);

router.patch("/visibility/:packageId", verifyJWT, packageController.togglePackageVisibility);

// In this router, we dont need to send every field that are mentioned in my 'package' model, we only need to send those fields from the frontend that are being updated (be it a binary or non-binary data)
// Also suppose initially you had 5 photos in this package. You want to remove 2 of them, keep the rest 3, and add 1 new photo to the package. Ask for a sample request from AI for such a case to check how things work and to set it accordingly in frontend
router.patch("/:packageId", verifyJWT, uploadPackageMedia, packageController.updatePackage);

router.delete("/:packageId", verifyJWT, packageController.deletePackage);

export default router;