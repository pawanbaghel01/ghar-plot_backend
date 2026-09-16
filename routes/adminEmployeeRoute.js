import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateEmployeePassword,
  getEmployeeDashboardStats
} from "../controllers/employeeController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Protected routes - require admin authentication
router.use(verifyAdminToken); // Apply admin authentication to all routes below

// Dashboard stats - admin access
router.get("/dashboard-stats", getEmployeeDashboardStats);

// Create new employee - admin access
router.post("/", createEmployee);

// Get all employees - admin access
router.get("/", getAllEmployees);

// Get employee by ID - admin access
router.get("/:id", getEmployeeById);

// Update employee - admin access
router.put("/:id", updateEmployee);

// Update employee password - admin access
router.put("/:id/password", updateEmployeePassword);

// Delete employee - admin access
router.delete("/:id", deleteEmployee);

// --- Sub-Admin Management Routes ---

// Get all sub-admins with their managed employees
import {
  assignEmployeesToSubAdmin,
  addEmployeesToSubAdmin,
  removeEmployeesFromSubAdmin,
  getSubAdminManagedEmployees,
  getAllSubAdmins
} from "../controllers/employeeController.js";

router.get("/sub-admins/list", getAllSubAdmins);

// Get employees managed by a specific sub-admin
router.get("/sub-admins/:subAdminId/managed-employees", getSubAdminManagedEmployees);

// Assign employees to sub-admin (replaces existing list)
router.put("/sub-admins/:subAdminId/assign-employees", assignEmployeesToSubAdmin);

// Add employees to sub-admin's managed list (without replacing)
router.post("/sub-admins/:subAdminId/add-employees", addEmployeesToSubAdmin);

// Remove employees from sub-admin's managed list
router.delete("/sub-admins/:subAdminId/remove-employees", removeEmployeesFromSubAdmin);

export default router;