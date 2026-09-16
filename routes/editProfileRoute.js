import express from "express";
import { editProfile } from "../controllers/editController.js";
import { upload } from "../middlewares/multer.js";
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// PUT /edit-profile/:id
router.put("/edit-profile", verifyToken, upload.single("photoAndVideo"), editProfile);

export default router;
