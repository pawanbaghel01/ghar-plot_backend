import express from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions
} from "../controllers/roleController.js";
import { 
  verifyEmployeeToken, 
  checkPermission,
  checkRole 
} from "../middlewares/roleMiddleware.js";

const router = express.Router();

// Get available permissions (modules and actions)
router.get("/permissions", getAvailablePermissions);

// Public route - no authentication required for getting permissions

// Protected routes - require authentication and role-based permissions
router.use(verifyEmployeeToken); // Apply authentication to all routes below

// Create new role - requires 'roles' module 'create' permission
router.post("/", checkPermission('roles', 'create'), createRole);

// Get all roles - requires 'roles' module 'read' permission
router.get("/", checkPermission('roles', 'read'), getAllRoles);

// Get role by ID - requires 'roles' module 'read' permission
router.get("/:id", checkPermission('roles', 'read'), getRoleById);

// Update role - requires 'roles' module 'update' permission
router.put("/:id", checkPermission('roles', 'update'), updateRole);

// Delete role - requires 'roles' module 'delete' permission
router.delete("/:id", checkPermission('roles', 'delete'), deleteRole);

export default router;