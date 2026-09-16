import express from "express";
import {
  getEmployeeLeads,
  updateLeadStatus
} from "../controllers/leadAssignmentController.js";
import { verifyEmployeeToken } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Employee routes - require employee authentication
router.use(verifyEmployeeToken);

// Get leads assigned to logged-in employee
router.get("/my-leads", async (req, res) => {
  try {
    // Get employee ID from the authenticated employee
    const employeeId = req.employee._id;
    
    // Call the controller with employee ID
    req.params.employeeId = employeeId;
    await getEmployeeLeads(req, res);
  } catch (error) {
    console.error("Error fetching employee leads:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch leads",
      error: error.message 
    });
  }
});

// Update lead status (employee can update their assigned leads)
router.put("/status/:assignmentId", async (req, res) => {
  try {
    // Verify the lead is assigned to this employee
    const { default: LeadAssignment } = await import("../models/leadAssignmentSchema.js");
    const assignment = await LeadAssignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: "Lead assignment not found" 
      });
    }
    
    if (assignment.employeeId.toString() !== req.employee._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this lead" 
      });
    }
    
    // Call the controller to update status
    await updateLeadStatus(req, res);
  } catch (error) {
    console.error("Error updating lead status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update lead status",
      error: error.message 
    });
  }
});

export default router;