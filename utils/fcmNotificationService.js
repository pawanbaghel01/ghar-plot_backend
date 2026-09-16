import admin from "../config/firebase.js";
import Employee from "../models/employeeSchema.js";
import Admin from "../models/adminAuthSchema.js";




export const sendEmployeeDueReminderNotification = async (employeeId, reminderData) => {
  try {
    const employee = await Employee.findById(employeeId);

    if (!employee || !employee.fcmToken) {
      console.log(`❌ [FCM-Fail] Employee ${employeeId} (${employee?.name || 'Unknown'}) - FCM token missing`);
      return { success: false, message: "FCM token not found" };
    }

    const { reminderId, title, clientName, phone, location, note, reminderTime } = reminderData;
    console.log(`🔔 [FCM-Prep] Preparing due reminder for ${employee.name} | Title: ${title}`);

    const notifTitle = `⏰ ${title || 'Reminder Due'}`;
    const notifBody = clientName ? `${clientName} - Reminder is due now` : 'Your scheduled reminder is due';

    const message = {
      token: employee.fcmToken,
      // Data-Only payload: background JS handler fires notifee.
      // Notice there is NO 'notification' object here.
      data: {
        type: "employee_due_reminder",
        reminderId: String(reminderId || ""),
        title: String(title || "⏰ Reminder Due"),
        body: String(notifBody),
        clientName: String(clientName || "N/A"),
        employeeName: "Reminder",
        createdBy: "Reminder Bot",
        phone: String(phone || "N/A"),
        location: String(location || "N/A"),
        note: String(note || ""),
        reminderTime: String(reminderTime || ""),
        timestamp: String(Date.now())
      },
      android: {
        priority: "high",
        ttl: 86400 // 🔥 24 hours. Don't drop immediately!
      },
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 1
          }
        },
        headers: {
          "apns-priority": "10",
          "apns-expiration": "86400" // 🔥 24 hours.
        }
      }
    };

    console.log(`🚀 [FCM-Send] Sending Data-Only push to ${employee.name}...`);
    const response = await admin.messaging().send(message);
    console.log(`✅ [FCM-Success] Message sent to ${employee.name}: ${response}`);

    return { success: true, messageId: response };

  } catch (error) {
    console.error("❌ [FCM-Critical-Error] sendEmployeeDueReminderNotification failed:", error.message);
    if (error.code) console.error("   Error Code:", error.code);
    return { success: false, message: error.message };
  }
};
export const sendReminderNotification = async (employeeId, reminderData) => {
  try {
    const employee = await Employee.findById(employeeId);

    if (!employee || !employee.fcmToken) {
      console.log(`❌ Employee ${employeeId} - FCM token not found`);
      return { success: false, message: "FCM token not found" };
    }

    const { reminderId, title, name, email, phone, location, note, reminderTime } = reminderData;

    // Message configuration for all 3 modes (DATA-ONLY for Notifee Custom UI)
    const message = {
      token: employee.fcmToken,

      // For KILL mode - data payload works when app is terminated
      data: {
        type: "reminder",
        reminderId: String(reminderId || ""),
        title: "🔔 Reminder",
        body: `Reminder: ${title || name || 'Client reminder'}`,
        name: String(name || ""),
        email: String(email || ""),
        phone: String(phone || ""),
        location: String(location || ""),
        note: String(note || ""),
        reminderTime: String(reminderTime || ""),
        timestamp: String(Date.now())
      },

      // Android specific - high priority for kill mode
      android: {
        priority: "high",
        // Force wake up without default notification block
      },

      // iOS specific - for kill mode delivery
      apns: {
        payload: {
          aps: {
            contentAvailable: true,
            sound: "default",
            badge: 1
          }
        },
        headers: {
          "apns-priority": "10"
        }
      }
    };

    console.log(`📤 [DISABLED] Skipping FCM notification to employee ${employee.name}`);

    // Disabled to stop duplicate / extra push notifications on user request
    // const response = await admin.messaging().send(message);
    // console.log(`✅ FCM notification sent successfully: ${response}`);

    const response = 'disabled_by_user';

    return { success: true, messageId: response };

  } catch (error) {
    console.error("❌ FCM notification error:", error);

    // Handle invalid token
    if (error.code === 'messaging/registration-token-not-registered' ||
      error.code === 'messaging/invalid-registration-token') {
      // Token is invalid, should be removed
      return { success: false, message: "Invalid token", shouldRemoveToken: true };
    }

    return { success: false, message: error.message };
  }
};
/**
 * Send FCM notification to Admin when employee creates a reminder or for due reminders
 * @param {Object} reminderData
 * @param {Object} employeeData - { employeeName, employeeEmail }
 * @param {string|ObjectId} [targetEmployeeId] - When provided, sub-admins who do NOT
 *   manage this employee are excluded from FCM. Main super-admins always receive.
 * @param {boolean} [excludeTarget] - If true, the targetEmployeeId is excluded from the notification list.
 */
 



export const sendAdminReminderNotification = async (reminderData, employeeData, targetEmployeeId = null, excludeTarget = true, notifySuperAdmins = true) => {
  try {
    // 1️⃣ Main super-admins from Admin collection
    // Only fetched if notifySuperAdmins = true (i.e., employee has adminReminderPopupEnabled = true)
    // When false → prevents super-admin from getting spammed for EVERY employee's reminder
    const admins = notifySuperAdmins
      ? await Admin.find({ fcmToken: { $exists: true, $ne: "" } })
      : [];

    if (!notifySuperAdmins) {
      console.log(`[FCM] notifySuperAdmins=false → skipping Admin collection, only alerting direct managers`);
    }

    // 2️⃣ Sub-admins from Employee collection with giveAdminAccess

    //    If targetEmployeeId is provided, only include sub-admins who manage that employee
    let subAdminTargets = [];
    const subAdminQuery = {
      giveAdminAccess: true,
      isActive: true,
      fcmToken: { $exists: true, $ne: "" }
    };

    if (targetEmployeeId) {
      if (excludeTarget) {
        // Exclude the target (e.g. creator of a manual reminder)
        subAdminQuery._id = { $ne: targetEmployeeId };
        subAdminQuery.managedEmployees = targetEmployeeId;
      } else {
        // Include the target AND their managers (e.g. for due reminders to managers)
        subAdminQuery.$or = [
          { managedEmployees: targetEmployeeId },
          { _id: targetEmployeeId }
        ];
      }
    }

    subAdminTargets = await Employee.find(subAdminQuery).select('name email fcmToken');

    if ((!admins || admins.length === 0) && subAdminTargets.length === 0) {
      console.log(`❌ No admins found with FCM tokens`);
      return { success: false, message: "No admin FCM tokens found" };
    }

    // ✅ Dedup: collect all tokens, send each token only once
    const seenTokens = new Set();

    // Prevent double-notification if the employee is also the sub-admin/admin
    // ONLY if we are excluding the target (preventing self-notification on creation)
    if (excludeTarget && targetEmployeeId && employeeData.fcmToken) {
      seenTokens.add(employeeData.fcmToken);
    }

    const uniqueAdmins = admins.filter(a => {
      // 🔥 CRITICAL: Skip if it's the SAME device or SAME person (by email)
      const tokenMatch = (excludeTarget && employeeData?.fcmToken && a.fcmToken === employeeData.fcmToken);
      const emailMatch = (excludeTarget && employeeData?.employeeEmail && a.email?.toLowerCase() === employeeData.employeeEmail.toLowerCase());

      if (tokenMatch || emailMatch) {
        console.log(`[FCM-DEBUG] Skipping admin ${a.email} because they are the assignee (Match: ${tokenMatch ? 'token' : 'email'})`);
        return false;
      }

      if (seenTokens.has(a.fcmToken)) return false;
      seenTokens.add(a.fcmToken);
      return true;
    });

    const uniqueSubAdmins = subAdminTargets.filter(sa => {
      // 🔥 Same for subadmins
      const tokenMatch = (excludeTarget && employeeData?.fcmToken && sa.fcmToken === employeeData.fcmToken);
      const emailMatch = (excludeTarget && employeeData?.employeeEmail && sa.email?.toLowerCase() === employeeData.employeeEmail.toLowerCase());

      if (tokenMatch || emailMatch) {
        console.log(`[FCM-DEBUG] Skipping subadmin ${sa.email} because they are the assignee (Match: ${tokenMatch ? 'token' : 'email'})`);
        return false;
      }

      if (seenTokens.has(sa.fcmToken)) return false;
      seenTokens.add(sa.fcmToken);
      return true;
    });
    const allTargets = [
      ...uniqueAdmins.map(a => ({ email: a.email, fcmToken: a.fcmToken, type: 'admin' })),
      ...uniqueSubAdmins.map(sa => ({ email: sa.email, fcmToken: sa.fcmToken, type: 'subadmin' })),
    ];

    console.log(`[FCM-DEBUG] sendAdminReminderNotification called | excludeTarget: ${excludeTarget} | targetEmployeeId: ${targetEmployeeId}`);
    console.log(`[FCM-DEBUG] Initial counts: admins=${admins.length}, subAdmins=${subAdminTargets.length}`);
    console.log(`[FCM-DEBUG] Unique targets count: ${allTargets.length}`);
    allTargets.forEach((t, i) => {
      console.log(`   [Target ${i + 1}] Type: ${t.type} | Email: ${t.email} | Token: ${t.fcmToken.substring(0, 20)}...`);
    });

    console.log(`📊 Admin FCM targets: ${admins.length} main-admin records + ${subAdminTargets.length} sub-admin(s) → ${allTargets.length} unique tokens${targetEmployeeId ? ` (filtered for employee ${targetEmployeeId})` : ''}`);

    const { _id, leadId, title, clientName, phone, location, note, reminderTime, isDue } = reminderData;
    const { employeeName, employeeEmail } = employeeData;

    // Distinguish title based on whether it's a new creation or a due alert
    const notificationTitle = isDue
      ? `⏰ Reminder Due - ${employeeName}`
      : `🔔 New Reminder Set - ${employeeName}`;

    const notificationBody = isDue
      ? `Reminder for ${clientName || 'Client'} is due now. (${title || 'Follow up'})`
      : `${employeeName} set a new reminder for ${clientName || 'Client'}`;

    // Send to all unique-token targets (main admins + filtered sub-admins)
    const sendPromises = allTargets.map(async (target) => {
      const message = {
        token: target.fcmToken,

        // 🔥 DATA-ONLY payload (like employee_due_reminder)
        // No 'notification' object - App's FCM handler will use Notifee for INDIGO theme
        data: {
          type: "admin_reminder",
          reminderId: String(_id || reminderData.reminderId || ""),
          enquiryId: String(leadId || ""),
          title: notificationTitle,
          body: notificationBody,
          employeeName: String(employeeName || ""),
          employeeEmail: String(employeeEmail || ""),
          reminderTitle: String(title || ""),
          clientName: String(clientName || ""),
          phone: String(phone || ""),
          location: String(location || ""),
          note: String(note || ""),
          reminderTime: String(reminderTime || ""),
          createdBy: String(employeeName || "System"),
          timestamp: String(Date.now())
        },

        android: {
          priority: "high",
          ttl: 86400 // 24 hours (same as employee reminder)
        },

        apns: {
          payload: {
            aps: {
              contentAvailable: true,
              sound: "default",
              badge: 1
            }
          },
          headers: {
            "apns-priority": "10",
            "apns-expiration": "86400" // 24 hours (same as employee reminder)
          }
        }
      };

      try {
        const response = await admin.messaging().send(message);
        console.log(`✅ FCM notification sent to ${target.type} ${target.email}: ${response}`);
        return { success: true, email: target.email, messageId: response };
      } catch (error) {
        console.error(`❌ FCM error for ${target.type} ${target.email}:`, error.code);
        if (error.code === 'messaging/registration-token-not-registered' ||
          error.code === 'messaging/invalid-registration-token') {
          // Clear invalid token from the right model
          if (target.type === 'admin') {
            await Admin.updateOne({ fcmToken: target.fcmToken }, { $set: { fcmToken: '' } });
          } else {
            await Employee.updateOne({ fcmToken: target.fcmToken }, { $set: { fcmToken: '' } });
          }
          console.log(`⚠️ Cleared invalid FCM token for ${target.type} ${target.email}`);
        }
        return { success: false, email: target.email, error: error.code };
      }
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;

    console.log(`📊 Admin FCM notifications: ${successCount}/${allTargets.length} sent successfully`);

    return {
      success: successCount > 0,
      totalAdmins: allTargets.length,
      successCount,
      results
    };

  } catch (error) {
    console.error("❌ Admin FCM notification error:", error);
    return { success: false, message: error.message };
  }
};




export default { sendReminderNotification, sendAdminReminderNotification, sendEmployeeDueReminderNotification };

