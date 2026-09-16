import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
  updateEmployeePassword,
  employeeLogin,
  getEmployeeDashboardStats,
  getEmployeeProfile,
  getEmployeesWithAdminAccess
} from "../controllers/employeeController.js";
import { 
  verifyEmployeeToken, 
  checkPermission,
  checkRole,
  checkDataAccess
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Public routes - no authentication required
router.post("/login", employeeLogin);

// Protected routes - require authentication
router.use(verifyEmployeeToken); // Apply authentication to all routes below

// Get own profile - no special permission needed (authenticated employees can view their own profile)
router.get("/profile", getEmployeeProfile);

// Dashboard stats - requires 'employees' module 'read' permission
router.get("/dashboard-stats", checkPermission('employees', 'read'), getEmployeeDashboardStats);

// Create new employee - requires 'employees' module 'create' permission
router.post("/", checkPermission('employees', 'create'), createEmployee);

// Get all employees - requires 'employees' module 'read' permission
router.get("/", checkPermission('employees', 'read'), getAllEmployees);

// Get employees with admin access - requires 'employees' module 'read' permission
router.get("/admin-access", checkPermission('employees', 'read'), getEmployeesWithAdminAccess);

// Get all employees for employee with admin access - no special permission needed, just admin access flag
router.get("/for-admin-employee", async (req, res, next) => {
  try {
    // Check if the logged-in employee has admin access
    if (!req.employee.giveAdminAccess) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin access required."
      });
    }
    // If they have admin access, allow them to get all employees
    await getAllEmployees(req, res);
  } catch (error) {
    next(error);
  }
});

// Get employee by ID - requires 'employees' module 'read' permission or own data access
router.get("/:id", checkDataAccess, getEmployeeById);

// Update employee - requires 'employees' module 'update' permission or own data access (limited)
router.put("/:id", (req, res, next) => {
  const requestedEmployeeId = req.params.id;
  const currentEmployeeId = req.employee._id.toString();
  
  // If updating own profile, allow limited fields
  if (requestedEmployeeId === currentEmployeeId) {
    // Remove sensitive fields that employees shouldn't be able to change themselves
    const allowedFields = ['name', 'phone', 'address'];
    const filteredBody = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        filteredBody[field] = req.body[field];
      }
    });
    req.body = filteredBody;
    return next();
  }
  
  // For updating other employees, check permission
  checkPermission('employees', 'update')(req, res, next);
}, updateEmployee);

// Update employee password - own password or with permission
router.put("/:id/password", (req, res, next) => {
  const requestedEmployeeId = req.params.id;
  const currentEmployeeId = req.employee._id.toString();
  
  // Allow updating own password
  if (requestedEmployeeId === currentEmployeeId) {
    return next();
  }
  
  // For updating other employees' passwords, check permission
  checkPermission('employees', 'update')(req, res, next);
}, updateEmployeePassword);

// Delete employee - requires 'employees' module 'delete' permission
router.delete("/:id", checkPermission('employees', 'delete'), deleteEmployee);

export default router;