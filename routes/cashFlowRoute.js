import express from "express";
import {
  createCashFlow,
  getAllCashFlows,
  getCashFlowById,
  updateCashFlow,
  deleteCashFlow,
} from "../controllers/cashFlowController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// GET all cash flow records - public / standard auth as per client/project routes
router.get("/", getAllCashFlows);

// GET single cash flow record by ID
router.get("/:id", getCashFlowById);

// All write operations require admin token verification
router.use(verifyAdminToken);

// POST create cash flow
router.post("/", createCashFlow);

// PUT update cash flow
router.put("/:id", updateCashFlow);

// DELETE cash flow
router.delete("/:id", deleteCashFlow);

export default router;
