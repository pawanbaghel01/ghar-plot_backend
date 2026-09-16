import Notification from '../models/notificationModel.js';
import Employee from '../models/employeeSchema.js';
import Admin from '../models/adminAuthSchema.js';
import admin from '../config/firebase.js';

// Receive bad attendant notification
export const receiveBadAttendantNotification = async (req, res) => {
  try {
    const {
      reminderId,
      employeeId,
      reminderTitle,
      clientName,
      response,
      wordCount,
      timestamp,
      severity,
      zone,
      message
    } = req.body;

    console.log('🔴 BAD ATTENDANT NOTIFICATION RECEIVED:', {
      reminderId,
      employeeId,
      reminderTitle,
      clientName,
      wordCount,
      zone
    });

    // Get employee details
    let employeeName = 'Unknown Employee';
    if (employeeId) {
      const employee = await Employee.findById(employeeId).select('name email');
      if (employee) {
        employeeName = employee.name || employee.email;
      }
    }

    // Create notification for admin
    const notification = new Notification({
      title: `🔴 BAD ATTENDANT ALERT - ${employeeName}`,
      message: message || `Employee ${employeeName} provided insufficient response (${wordCount} words) for reminder: ${reminderTitle}`,
      type: 'bad_attendant',
      priority: 'high',
      metadata: {
        reminderId,
        employeeId,
        employeeName,
        reminderTitle,
        clientName,
        response,
        wordCount,
        zone: 'RED',
        severity: 'high',
        timestamp: timestamp || new Date().toISOString()
      },
      read: false,
      createdAt: new Date()
    });

    await notification.save();

    console.log('✅ Bad attendant notification saved:', notification._id);

    res.status(201).json({
      success: true,
      message: 'Bad attendant notification recorded',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error saving bad attendant notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save notification',
      error: error.message
    });
  }
};

// Get all bad attendant notifications (for admin)
export const getBadAttendantNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false
    } = req.query;

    const query = { type: 'bad_attendant' };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    // Sub-admin restriction: only show notifications for managed employees
    if (req.isAdminEmployee) {
      const adminId = req.user?.id || req.user?._id;
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        if (managedIds.length === 0) {
          return res.json({ success: true, data: { notifications: [], pagination: { currentPage: 1, totalPages: 0, total: 0, hasNext: false, hasPrev: false } } });
        }
        query['metadata.employeeId'] = { $in: managedIds };
      }
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    // Enrich notifications with full employee details
    const enrichedNotifications = await Promise.all(
      notifications.map(async (notification) => {
        const notificationObj = notification.toObject();

        // Fetch employee details if employeeId exists in metadata
        if (notificationObj.metadata?.employeeId) {
          try {
            const employee = await Employee.findById(notificationObj.metadata.employeeId)
              .select('name email phone role designation department');

            if (employee) {
              notificationObj.metadata.employeeDetails = {
                name: employee.name,
                email: employee.email,
                phone: employee.phone,
                role: employee.role,
                designation: employee.designation,
                department: employee.department
              };
            }
          } catch (err) {
            console.error('Error fetching employee details:', err);
          }
        }

        return notificationObj;
      })
    );

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications: enrichedNotifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching bad attendant notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notifications',
      error: error.message
    });
  }
};

// Mark notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findByIdAndUpdate(
      notificationId,
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};

// Get bad attendant statistics
export const getBadAttendantStats = async (req, res) => {
  try {
    const { days = 7 } = req.query;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const stats = await Notification.aggregate([
      {
        $match: {
          type: 'bad_attendant',
          createdAt: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$metadata.employeeId',
          employeeName: { $first: '$metadata.employeeName' },
          count: { $sum: 1 },
          totalWordCount: { $sum: '$metadata.wordCount' },
          avgWordCount: { $avg: '$metadata.wordCount' }
        }
      },
      {
        $sort: { count: -1 }
      }
    ]);

    const total = await Notification.countDocuments({
      type: 'bad_attendant',
      createdAt: { $gte: startDate }
    });

    res.json({
      success: true,
      data: {
        total,
        byEmployee: stats,
        period: `Last ${days} days`
      }
    });

  } catch (error) {
    console.error('❌ Error fetching bad attendant stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
};

// Get admin reminder notifications
export const getAdminReminderNotifications = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      unreadOnly = false
    } = req.query;

    const query = { type: 'admin_reminder' };

    if (unreadOnly === 'true') {
      query.read = false;
    }

    // Sub-admin restriction: only show notifications for managed employees
    if (req.isAdminEmployee) {
      const adminId = req.user?.id || req.user?._id;
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        if (managedIds.length === 0) {
          return res.json({ success: true, data: { notifications: [], unreadCount: 0, pagination: { currentPage: 1, totalPages: 0, total: 0, hasNext: false, hasPrev: false } } });
        }
        query['metadata.employeeId'] = { $in: managedIds };
      }
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ ...query, $or: [{ read: false }, { isRead: false }] });

    res.json({
      success: true,
      data: {
        notifications,
        unreadCount,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: parseInt(page) * parseInt(limit) < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Error fetching admin reminder notifications:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch admin reminder notifications',
      error: error.message
    });
  }
};

// Mark admin reminder notification as read
export const markAdminReminderAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;

    const notification = await Notification.findOneAndUpdate(
      { _id: notificationId, type: 'admin_reminder' },
      { read: true, readAt: new Date() },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Admin reminder notification not found'
      });
    }

    res.json({
      success: true,
      message: 'Admin reminder notification marked as read',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error marking admin reminder notification as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
};

// Mark all admin reminder notifications as read
export const markAllAdminRemindersAsRead = async (req, res) => {
  try {
    console.log('📬 BACKEND: Received Mark All as Read request');
    const query = { type: 'admin_reminder', $or: [{ read: false }, { isRead: false }] };

    // Sub-admin restriction
    if (req.isAdminEmployee) {
      const adminId = req.user?.id || req.user?._id;
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        if (managedIds.length > 0) {
          query['metadata.employeeId'] = { $in: managedIds };
        }
      }
    }

    console.log('🔍 BACKEND: Mark All Query:', JSON.stringify(query));

    const result = await Notification.updateMany(
      query,
      {
        read: true,
        isRead: true,
        readAt: new Date()
      }
    );

    console.log(`✅ BACKEND: Mark All result: ${result.modifiedCount} updated`);

    res.json({
      success: true,
      message: `${result.modifiedCount} notifications marked as read`,
      data: {
        modifiedCount: result.modifiedCount
      }
    });

  } catch (error) {
    console.error('❌ Error marking all admin reminders as read:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update notifications',
      error: error.message
    });
  }
};

// Delete single admin reminder notification
export const deleteAdminReminder = async (req, res) => {
  try {
    const { notificationId } = req.params;
    console.log(`🗑️ BACKEND: Request to delete notification ID: ${notificationId}`);

    const notification = await Notification.findOneAndDelete({
      _id: notificationId,
      type: 'admin_reminder'
    });

    if (!notification) {
      console.log(`⚠️ BACKEND: Notification ${notificationId} not found or not of type admin_reminder`);
      return res.status(404).json({
        success: false,
        message: 'Admin reminder notification not found'
      });
    }

    console.log(`✅ BACKEND: Notification ${notificationId} deleted successfully`);
    res.json({
      success: true,
      message: 'Admin reminder notification deleted',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error deleting admin reminder notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notification',
      error: error.message
    });
  }
};

// Clear all admin reminder notifications
export const deleteAllAdminReminders = async (req, res) => {
  try {
    console.log('📬 BACKEND: Received Clear All request for admin reminders');
    const query = { type: 'admin_reminder' };

    // Sub-admin restriction
    if (req.isAdminEmployee) {
      const adminId = req.user?.id || req.user?._id;
      const subAdmin = await Employee.findById(adminId).select('giveAdminAccess managedEmployees');
      if (subAdmin && subAdmin.giveAdminAccess) {
        const managedIds = (subAdmin.managedEmployees || []).map(id => id.toString());
        if (managedIds.length > 0) {
          query['metadata.employeeId'] = { $in: managedIds };
        }
      }
    }

    const result = await Notification.deleteMany(query);
    console.log(`✅ BACKEND: Clear All result: ${result.deletedCount} deleted`);

    res.json({
      success: true,
      message: `${result.deletedCount} notifications deleted`,
      data: {
        deletedCount: result.deletedCount
      }
    });

  } catch (error) {
    console.error('❌ Error deleting all admin reminders:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete notifications',
      error: error.message
    });
  }
};

// Receive employee reminder/alert notifications and send FCM to admin
export const receiveEmployeeNotification = async (req, res) => {
  try {
    const {
      title,
      message,
      notificationType,
      fcmPayload,
      scheduledDate,
      scheduledTime,
      clientName,
      phone,
      email,
      enquiryId,
      reminderTitle,
      reminderNote,
      alertTitle,
      alertReason,
      repeatType,
      repeatFrequency,
      employeeId,
      employeeName
    } = req.body;

    console.log('🔔 Employee notification received:', {
      notificationType,
      title,
      employeeId,
      employeeName
    });

    // 1. Save notification to database
    const notification = new Notification({
      title,
      message,
      type: notificationType || 'employee_notification',
      priority: 'high',
      metadata: {
        scheduledDate,
        scheduledTime,
        clientName,
        phone,
        email,
        enquiryId,
        reminderTitle,
        reminderNote,
        alertTitle,
        alertReason,
        repeatType,
        repeatFrequency,
        employeeId,
        employeeName
      },
      read: false,
      createdAt: new Date()
    });

    await notification.save();
    console.log('✅ Notification saved to database:', notification._id);

    // 2. 🔥 Send FCM Push Notification to Admin
    const adminUser = await Admin.findOne({}).sort({ createdAt: 1 });

    if (adminUser && adminUser.fcmToken) {
      const fcmMessage = {
        token: adminUser.fcmToken,
        // 🔥 DATA-ONLY: Explicitly removed top-level 'notification' block.
        data: {
          type: notificationType || 'employee_notification',
          notificationId: notification._id.toString(),
          title: String(title || "New Notification"),
          body: String(message || "You have an update"),
          enquiryId: String(enquiryId || ''),
          clientName: String(clientName || ''),
          reminderTitle: String(reminderTitle || ''),
          reminderNote: String(reminderNote || ''),
          alertTitle: String(alertTitle || ''),
          alertReason: String(alertReason || ''),
          scheduledDate: String(scheduledDate || ''),
          scheduledTime: String(scheduledTime || ''),
          employeeId: String(employeeId || ''),
          employeeName: String(employeeName || ''),
          timestamp: String(Date.now())
        },
        android: {
          priority: 'high',
          ttl: 0 // Drop immediately if not delivered
        },
        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: 'default'
            }
          }
        }
      };

      try {
        const response = await admin.messaging().send(fcmMessage);
        console.log('✅ FCM notification sent to admin (Data-Only):', response);
      } catch (fcmError) {
        console.error('❌ Admin FCM send error:', fcmError.message);
      }
    }

    // 3. 🔔 Send FCM to sub-admins
    if (employeeId) {
      const subAdmins = await Employee.find({
        giveAdminAccess: true,
        isActive: true,
        managedEmployees: employeeId
      }).select('name email fcmToken');

      for (const subAdmin of subAdmins) {
        if (subAdmin.fcmToken) {
          const subAdminMessage = {
            token: subAdmin.fcmToken,
            data: {
              type: notificationType || 'employee_notification',
              notificationId: notification._id.toString(),
              title: String(title || "New Team Notification"),
              body: String(message || "Team update received"),
              employeeName: String(employeeName || ''),
              reminderTitle: String(reminderTitle || ''),
              timestamp: String(Date.now())
            },
            android: { priority: 'high', ttl: 0 }
          };
          try {
            await admin.messaging().send(subAdminMessage);
            console.log(`✅ FCM (Data-Only) sent to sub-admin ${subAdmin.name}`);
          } catch (e) {
            console.error(`❌ Sub-admin FCM failed:`, e.message);
          }
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Notification sent to admin successfully',
      data: notification
    });

  } catch (error) {
    console.error('❌ Error processing employee notification:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
};
