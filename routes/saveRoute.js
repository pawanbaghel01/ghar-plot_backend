import express from "express";
import {
  saveProperty,
  getSavedProperties,
  removeSavedProperty,
} from "../controllers/saveController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post("/save", verifyToken, saveProperty);
router.get("/saved/all", verifyToken, getSavedProperties);
router.delete("/remove", verifyToken, removeSavedProperty);

export default router;
