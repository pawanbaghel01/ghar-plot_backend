import express from "express";
import {
  getWorkStatuses,
  getWorkStatusById,
  createWorkStatus,
  updateWorkStatus,
  deleteWorkStatus,
  syncFromCsv,
} from "../controllers/workStatusController.js";

const router = express.Router();

// GET /admin/work-status - Fetch with filters & pagination
router.get("/", getWorkStatuses);

// POST /admin/work-status/sync - Trigger synchronization from CSV
router.post("/sync", syncFromCsv);

// GET /admin/work-status/:id - Get by ID
router.get("/:id", getWorkStatusById);

// POST /admin/work-status - Create or Upsert
router.post("/", createWorkStatus);

// PUT /admin/work-status/:id - Update status
router.put("/:id", updateWorkStatus);

// DELETE /admin/work-status/:id - Delete entry
router.delete("/:id", deleteWorkStatus);

export default router;
