import express from "express";
import { getMySellProperties } from "../controllers/sellController.js";
import { verifyToken } from '../middlewares/authMiddleware.js';

const router = express.Router();

// GET properties added by logged-in user
router.get("/my-sell-properties", verifyToken, getMySellProperties);



export default router;
