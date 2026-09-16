import express from "express";
import { getRevenueStatus } from "../controllers/revenueController.js";

const router = express.Router();

// GET /api/property/revenue = total revenue , residential revenue , commercial revenue and monthly revenue (total, residential, commercial)
router.get("/revenue", getRevenueStatus);

export default router;
