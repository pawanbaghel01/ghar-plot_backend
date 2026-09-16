import express from "express";
import {
  getEmployeeUserLeads,
  updateUserLeadStatus
} from "../controllers/userLeadAssignmentController.js";
import { verifyEmployeeToken } from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Employee routes - require employee authentication
router.use(verifyEmployeeToken);

// Get user leads assigned to logged-in employee
router.get("/my-client-leads", async (req, res) => {
  try {
    // Get employee ID from the authenticated employee
    const employeeId = req.employee._id;
    
    // Call the controller with employee ID
    req.params.employeeId = employeeId;
    await getEmployeeUserLeads(req, res);
  } catch (error) {
    console.error("Error fetching employee user leads:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to fetch client leads",
      error: error.message 
    });
  }
});

// Update user lead status (employee can update their assigned user leads)
router.put("/status/:assignmentId", async (req, res) => {
  try {
    // Verify the user lead is assigned to this employee
    const { default: UserLeadAssignment } = await import("../models/userLeadAssignmentSchema.js");
    const assignment = await UserLeadAssignment.findById(req.params.assignmentId);
    
    if (!assignment) {
      return res.status(404).json({ 
        success: false, 
        message: "User lead assignment not found" 
      });
    }
    
    if (assignment.employeeId.toString() !== req.employee._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: "Not authorized to update this user lead" 
      });
    }
    
    // Call the controller to update status
    await updateUserLeadStatus(req, res);
  } catch (error) {
    console.error("Error updating user lead status:", error);
    res.status(500).json({ 
      success: false, 
      message: "Failed to update user lead status",
      error: error.message 
    });
  }
});

export default router;