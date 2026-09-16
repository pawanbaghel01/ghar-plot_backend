import express from "express";
import {
  createProject,
  getAllProjects,
  getProjectById,
  updateProject,
  deleteProject,
} from "../controllers/projectController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// GET /admin/projects — public, no auth required
router.get("/", getAllProjects);

// All routes below require admin authentication
router.use(verifyAdminToken);

// POST   /admin/projects       — Create project
router.post("/", createProject);

// GET    /admin/projects/:id   — Get project by ID
router.get("/:id", getProjectById);

// PUT    /admin/projects/:id   — Update project
router.put("/:id", updateProject);

// DELETE /admin/projects/:id   — Delete project
router.delete("/:id", deleteProject);

export default router;
