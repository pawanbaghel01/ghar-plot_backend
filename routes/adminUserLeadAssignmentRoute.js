import express from "express";
import {
  assignUsersToEmployee,
  getAllUserLeadAssignments,
  updateUserLeadStatus,
  unassignUserLeads,
  getAvailableUsers,
  getAvailableEmployeesForUserLeads
} from "../controllers/userLeadAssignmentController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Admin routes - require admin authentication
router.use(verifyAdminToken);

// Assign user leads to employee
router.post("/assign", assignUsersToEmployee);

// Get all user lead assignments (admin view)
router.get("/all", getAllUserLeadAssignments);

// Get available users for assignment
router.get("/available-users", getAvailableUsers);

// Get available employees for user assignment
router.get("/available-employees", getAvailableEmployeesForUserLeads);

// Update user lead status
router.put("/status/:assignmentId", updateUserLeadStatus);

// Unassign user leads
router.post("/unassign", unassignUserLeads);

export default router;