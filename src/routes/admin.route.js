// This route is for admin only
admin k saare routes pe 'verifyJWT' middleware lagana baki h, except login and createAdmin

import express from 'express';
import * as adminController from '../controllers/admin.controller.js';

const router = express.Router();

This route is to be accessed only by me to just create the admin in the db, after that dont forget to comment out this route only (not its controllers and services) to prevent it from any misuse
router.post("/create-admin", adminController.createAdmin)

router.post("/login", adminController.login)

router.get("/dashboard", adminController.dashboard)



router.post("/logout", adminController.logout)

export default router;