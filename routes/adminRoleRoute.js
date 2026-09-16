import express from "express";
import {
  createRole,
  getAllRoles,
  getRoleById,
  updateRole,
  deleteRole,
  getAvailablePermissions
} from "../controllers/roleController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// Get available permissions (modules and actions) - no auth required
router.get("/permissions", getAvailablePermissions);

// Protected routes - require admin authentication
router.use(verifyAdminToken); // Apply admin authentication to all routes below

// Create new role - admin access
router.post("/", createRole);

// Get all roles - admin access
router.get("/", getAllRoles);

// Get role by ID - admin access
router.get("/:id", getRoleById);

// Update role - admin access
router.put("/:id", updateRole);

// Delete role - admin access
router.delete("/:id", deleteRole);

export default router;