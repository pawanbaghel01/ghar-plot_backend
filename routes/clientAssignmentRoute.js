import express from "express";
import {
  assignClientToEmployee,
  getEmployeeAssignments,
  unassignClient
} from "../controllers/clientAssignmentController.js";
import { 
  verifyEmployeeToken, 
  checkPermission 
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Protected routes - require authentication
router.use(verifyEmployeeToken);

// Assign client to employee - requires users or enquiries read permission
router.post("/assign", 
  checkPermission('users', 'read'), 
  assignClientToEmployee
);

// Get assignments for an employee
router.get("/assignments/:employeeId", 
  checkPermission('users', 'read'), 
  getEmployeeAssignments
);

// Unassign client from employee
router.post("/unassign", 
  checkPermission('users', 'update'), 
  unassignClient
);

export default router;