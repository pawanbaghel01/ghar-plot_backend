import express from 'express';
import {
  receiveBadAttendantNotification,
  getBadAttendantNotifications,
  markNotificationAsRead,
  getBadAttendantStats,
  getAdminReminderNotifications,
  markAdminReminderAsRead,
  markAllAdminRemindersAsRead,
  deleteAdminReminder,
  deleteAllAdminReminders,
  receiveEmployeeNotification
} from '../controllers/adminNotificationController.js';
import { verifyAdminToken } from '../middlewares/adminAuthMiddleware.js';

const router = express.Router();

// Receive employee reminder/alert notifications and send FCM to admin
router.post('/', receiveEmployeeNotification);

// Receive bad attendant notification (can be called by employees)
router.post('/bad-attendant', receiveBadAttendantNotification);

// Get all bad attendant notifications (admin only)
router.get('/bad-attendant/list', verifyAdminToken, getBadAttendantNotifications);

// Get bad attendant statistics (admin only)
router.get('/bad-attendant/stats', verifyAdminToken, getBadAttendantStats);

// Mark notification as read (admin only)
router.put('/read/:notificationId', verifyAdminToken, markNotificationAsRead);

// Admin reminder notification routes
router.put('/admin-reminders/mark-all-read', verifyAdminToken, markAllAdminRemindersAsRead);
router.get('/admin-reminders', verifyAdminToken, getAdminReminderNotifications);
router.put('/admin-reminders/:notificationId/read', verifyAdminToken, markAdminReminderAsRead);
router.delete('/admin-reminders/delete-all', verifyAdminToken, deleteAllAdminReminders);
router.delete('/admin-reminders/:notificationId', verifyAdminToken, deleteAdminReminder);

export default router;
