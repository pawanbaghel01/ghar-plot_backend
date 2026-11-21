import express from "express";
import {
  registerDevice,
  deviceHeartbeat,
  logoutDevice,
  getAdminDevices,
  revokeAdminDevice,
} from "../controllers/adminDeviceController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All device management routes require valid Admin JWT authentication
router.post("/register", verifyToken, registerDevice);
router.post("/heartbeat", verifyToken, deviceHeartbeat);
router.post("/logout", verifyToken, logoutDevice);
router.get("/", verifyToken, getAdminDevices);
router.delete("/:id", verifyToken, revokeAdminDevice);

export default router;
