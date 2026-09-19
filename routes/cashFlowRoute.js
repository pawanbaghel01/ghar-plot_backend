import express from "express";
import {
  createCashFlow,
  getAllCashFlows,
  getCashFlowById,
  updateCashFlow,
  deleteCashFlow,
  getPreviousClosingBalance,
} from "../controllers/cashFlowController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// GET previous day's closing balance for associate
router.get("/opening-balance/:associateId", getPreviousClosingBalance);

// GET all cash flow records - public / standard auth as per client/project routes
router.get("/", getAllCashFlows);

// GET single cash flow record by ID
router.get("/:id", getCashFlowById);

// POST create or settle cash flow (Admin and Employees can assign cash)
router.post("/", createCashFlow);

// PUT update cash flow
router.put("/:id", updateCashFlow);

// DELETE cash flow requires admin
router.delete("/:id", verifyAdminToken, deleteCashFlow);

export default router;
