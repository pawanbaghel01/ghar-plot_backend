import express from "express";
import {
  createAlert,
  getAlerts,
  getAlertById,
  editAlert,
  deleteAlert,
  getTriggeredAlerts,
  getAlertsByDateTime,
  scheduleNotification,
  deleteAlertsByCategory,          // ✅ ADD THIS
  deleteMultipleAlerts      // ✅ ADD THIS
} from "../controllers/alertController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Schedule notification for alert (with FCM support)
router.post("/schedule-notification", scheduleNotification);

// Create a new alert
router.post("/", createAlert);

// Get all alerts for the logged-in user
router.get("/", getAlerts);

// Get alerts by specific date and time
router.get("/by-datetime", getAlertsByDateTime);

// Delete ALL alerts of logged-in user
router.delete("/delete-all", verifyToken, deleteAlertsByCategory);

// Delete MULTIPLE alerts
router.delete("/delete-multiple", verifyToken, deleteMultipleAlerts);

// Get triggered alerts (for notifications/cron)
router.get("/triggered", getTriggeredAlerts);

// Get a specific alert by ID
router.get("/:id", getAlertById);

// Edit/Update an alert
router.put("/:id", editAlert);

// Delete an alert
router.delete("/:id", deleteAlert);

export default router;
