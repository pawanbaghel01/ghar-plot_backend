import express from "express";
import {
  createClient,
  getAllClients,
  getClientById,
  updateClient,
  deleteClient,
  assignClient,
} from "../controllers/clientController.js";
import { verifyAdminToken } from "../middlewares/adminAuthMiddleware.js";

const router = express.Router();

// GET    /admin/clients          — Get all clients (public, no auth required)
router.get("/", getAllClients);

// All routes below require admin authentication
router.use(verifyAdminToken);

// POST   /admin/clients          — Create a new client
router.post("/", createClient);

// GET    /api/clients/:id      — Get client by ID
router.get("/:id", getClientById);

// PUT    /api/clients/:id      — Update client
router.put("/:id", updateClient);

// PATCH  /api/clients/:id/assign — Assign client to an employee
router.patch("/:id/assign", assignClient);

// DELETE /api/clients/:id      — Delete client
router.delete("/:id", deleteClient);

export default router;
