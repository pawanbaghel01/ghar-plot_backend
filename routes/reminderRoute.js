import express from "express";
import {
  createReminder,
  createReminderFromLead,
  getEmployeeReminders,
  getDueReminders,
  completeReminder,
  snoozeReminder,
  dismissReminder,
  updateReminder,
  deleteReminder,
  getReminderStats,
  getReminders,
  getRemindersByManualInquiry,
  getRemindersByEmployeeId,
  scheduleReminderNotification,
  markReminderAsSeen
} from "../controllers/reminderController.js";
import { verifyToken } from "../middlewares/authMiddleware.js";

const router = express.Router();

// Employee reminder routes (all require authentication)
router.use(verifyToken);

// Create a new reminder
router.post("/create", createReminder);

// Schedule FCM notification for reminder
router.post("/schedule-notification", scheduleReminderNotification);

// Create reminder from lead data (simplified)
router.post("/create-from-lead", createReminderFromLead);

// Get employee's reminders (with pagination and filtering)
router.get("/list", getEmployeeReminders);

// Main route for getting reminders (matches /employee/reminders directly)
router.get("/", getReminders);

// Legacy route for backward compatibility
router.get("/reminders", getReminders);

// Get due reminders for popup notifications
router.get("/due", getDueReminders);

// Get reminders by employee ID (Admin)
router.get("/employee/:employeeId", getRemindersByEmployeeId);

// Complete a reminder
router.put("/complete/:reminderId", completeReminder);

// Snooze a reminder
router.put("/snooze/:reminderId", snoozeReminder);

// Dismiss a reminder
router.put("/dismiss/:reminderId", dismissReminder);

// Update reminder settings
router.put("/update/:reminderId", updateReminder);

// Mark reminder as seen
router.put("/mark-seen/:reminderId", markReminderAsSeen);

// Delete a reminder
router.delete("/delete/:reminderId", deleteReminder);

// Get reminder statistics
router.get("/stats", getReminderStats);

// Get reminders by manual inquiry ID
router.get("/manual-inquiry/:manualInquiryId", getRemindersByManualInquiry);

export default router;
