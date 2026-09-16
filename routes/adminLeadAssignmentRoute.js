import express from "express";
import {
  assignLeadsToEmployee,
  getEmployeeLeads,
  getAllLeadAssignments,
  updateLeadStatus,
  unassignLeads,
  getAvailableEmployees
} from "../controllers/leadAssignmentController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Admin routes - require admin authentication
router.use(verifyAdminToken);

// Assign leads to employee
router.post("/assign", assignLeadsToEmployee);

// Get all lead assignments (admin view)
router.get("/all", getAllLeadAssignments);

// Get available employees for assignment
router.get("/available-employees", getAvailableEmployees);

// Get leads for specific employee
router.get("/employee/:employeeId", getEmployeeLeads);

// Update lead status
router.put("/status/:assignmentId", updateLeadStatus);

// Unassign leads
router.post("/unassign", unassignLeads);

export default router;