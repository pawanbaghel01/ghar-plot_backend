import express from "express";
import {
  getSiteTools,
  createSiteTool,
  updateSiteTool,
  deleteSiteTool,
  verifyAndTransferTool,
  getToolTransfers,
} from "../controllers/siteToolController.js";

const router = express.Router();

// Verification and Transfer routes (Place before :id)
router.post("/verify-transfer", verifyAndTransferTool);
router.get("/transfers", getToolTransfers);

// Site Tools CRUD routes
router.get("/", getSiteTools);
router.post("/", createSiteTool);
router.put("/:id", updateSiteTool);
router.delete("/:id", deleteSiteTool);

export default router;
