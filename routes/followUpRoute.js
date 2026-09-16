import express from "express";
import {
  createFollowUp,
  createFollowUpFromLead,
  getAllFollowUps,
  getFollowUpsByLead,
  getMyFollowUps,
  updateFollowUpStatus,
  addFollowUpComment,
  getFollowUpStats,
  deleteFollowUp
} from "../controllers/followUpController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create new follow-up (agents, managers, admins)
router.post("/create", createFollowUp);

// Create follow-up from lead data (simplified)
router.post("/create-from-lead", createFollowUpFromLead);

// Get my follow-ups (agent view)
router.get("/my-followups", getMyFollowUps);

// Get follow-ups for a specific lead
router.get("/lead/:leadType/:leadId", getFollowUpsByLead);

// Add comment to follow-up
router.post("/:followUpId/comment", addFollowUpComment);

// Update follow-up status (agent can update their own)
router.put("/:followUpId/status", updateFollowUpStatus);

// Admin/Manager only routes
router.use(verifyAdminToken);

// Get all follow-ups with filters (admin/manager view)
router.get("/all", getAllFollowUps);

// Get follow-up statistics
router.get("/stats", getFollowUpStats);

// Delete follow-up (admin only)
router.delete("/:followUpId", deleteFollowUp);

export default router;