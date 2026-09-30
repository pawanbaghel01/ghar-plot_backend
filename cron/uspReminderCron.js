import cron from "node-cron";
import USPEmployee from "../models/uspEmployeeSchema.js";
import Admin from "../models/adminAuthSchema.js";
import Employee from "../models/employeeSchema.js";
import { sendPushNotification } from "../utils/sendNotification.js";
import { sendEmployeeDueReminderNotification } from "../utils/fcmNotificationService.js";

let socketIo;
let isProcessingUSPReminders = false;

export const initUSPReminderCron = (io) => {
  socketIo = io;
  console.log("⏰ USP Reminder cron initialized - Checking every 30 seconds");

  // Check USP reminders every 30 seconds
  cron.schedule("*/30 * * * * *", async () => {
    if (isProcessingUSPReminders) {
      return;
    }

    try {
      isProcessingUSPReminders = true;
      const now = new Date();

      // Find USP entries with active due reminders
      const dueUSPEntries = await USPEmployee.find({
        isActive: true,
        isReminderActive: true,
        cronFired: { $ne: true },
        scheduledDateTime: { $lte: now },
      })
        .populate("employee", "name email phone fcmToken fcmTokens")
        .populate("assignedEmployee", "name email phone fcmToken fcmTokens")
        .populate("createdByAdmin", "name email fcmToken fcmTokens");

      if (!dueUSPEntries.length) {
        return;
      }

      console.log(`📋 [USPReminderCron] Found ${dueUSPEntries.length} due USP reminder(s) at ${now.toISOString()}`);

      for (const usp of dueUSPEntries) {
        try {
          const freshUSP = await USPEmployee.findById(usp._id);
          if (!freshUSP || !freshUSP.isActive || !freshUSP.isReminderActive || freshUSP.cronFired) {
            continue;
          }

          // Throttle: avoid re-triggering within 25 seconds
          if (freshUSP.lastTriggered && (now.getTime() - new Date(freshUSP.lastTriggered).getTime()) < 25 * 1000) {
            continue;
          }

          const targetName = usp.employeeType === "manual"
            ? (usp.manualName || "Team USP")
            : (usp.employee?.name || "Team Member");
          const targetPhone = usp.employeeType === "manual"
            ? (usp.manualPhone || "")
            : (usp.employee?.phone || "");
          const reminderTitle = usp.reminderTitle || `Team USP Reminder - ${targetName}`;
          const reminderNote = usp.description || `Follow-up reminder for ${targetName}`;

          console.log(`🚀 [USPReminderCron] Triggering: "${reminderTitle}" for ${targetName}`);

          // ==========================================
          // 1️⃣ SEND TO CREATOR ADMIN (ALWAYS)
          // ==========================================
          let adminTokens = [];
          if (usp.createdByAdmin) {
            const adminUser = await Admin.findById(usp.createdByAdmin).select("fcmTokens fcmToken email name");
            if (adminUser) {
              adminTokens = adminUser.fcmTokens?.length
                ? adminUser.fcmTokens.map(t => t.token || t).filter(Boolean)
                : (adminUser.fcmToken ? [adminUser.fcmToken] : []);
            }
          }

          // Fallback if no specific admin token found: broadcast to super admins
          if (!adminTokens.length) {
            const allAdmins = await Admin.find().select("fcmTokens fcmToken");
            for (const adm of allAdmins) {
              const toks = adm.fcmTokens?.length
                ? adm.fcmTokens.map(t => t.token || t).filter(Boolean)
                : (adm.fcmToken ? [adm.fcmToken] : []);
              adminTokens.push(...toks);
            }
          }

          // Deduplicate admin tokens
          adminTokens = [...new Set(adminTokens.filter(Boolean))];

          if (adminTokens.length > 0) {
            console.log(`📤 [USPReminderCron] Sending push to Creator Admin (${adminTokens.length} devices)`);
            await sendPushNotification(
              adminTokens,
              reminderTitle,
              reminderNote,
              {
                type: "admin_reminder",
                reminderId: usp._id.toString(),
                alertId: usp._id.toString(),
                title: reminderTitle,
                body: reminderNote,
                reminderTitle: reminderTitle,
                note: reminderNote,
                clientName: targetName,
                name: targetName,
                phone: targetPhone,
                contactNumber: targetPhone,
                isDue: "true",
                timestamp: String(Date.now()),
                screen: "USPEmployeesScreen",
                deepLink: "gharplot://uspEmployees",
              }
            );
          }

          // Emit in-app socket if admin is currently in app
          if (socketIo) {
            socketIo.emit("employeeDueReminder", {
              flowType: "new_reminder_flow",
              senderName: "USP Reminder Bot",
              displayTitle: "⏰ Team's USP Reminder!",
              displayMessage: reminderTitle,
              id: usp._id.toString(),
              name: targetName,
              title: reminderTitle,
              note: reminderNote,
              phone: targetPhone,
              contactNumber: targetPhone,
              reminderDateTime: usp.scheduledDateTime,
              assignmentType: "usp",
              status: "pending",
            });
          }

          // ==========================================
          // 2️⃣ SEND TO ASSIGNED EMPLOYEE (IF SELECTED)
          // ==========================================
          if (usp.assignedEmployee) {
            const assigneeId = usp.assignedEmployee._id || usp.assignedEmployee;
            console.log(`📤 [USPReminderCron] Sending due reminder to Assigned Employee ID: ${assigneeId}`);
            await sendEmployeeDueReminderNotification(assigneeId, {
              reminderId: usp._id.toString(),
              title: reminderTitle,
              clientName: targetName,
              phone: targetPhone,
              location: "Team's USP",
              note: reminderNote,
              reminderTime: usp.scheduledDateTime,
            });
          }

          // ==========================================
          // 3️⃣ HANDLE REPEAT FREQUENCY OR COMPLETE
          // ==========================================
          if (usp.repeatType === "daily") {
            usp.scheduledDateTime = new Date(usp.scheduledDateTime.getTime() + 24 * 60 * 60 * 1000);
            usp.scheduledDate = usp.scheduledDateTime;
            console.log(`🔄 [USPReminderCron] Daily repeat scheduled for: ${usp.scheduledDateTime.toISOString()}`);
          } else if (usp.repeatType === "weekly") {
            usp.scheduledDateTime = new Date(usp.scheduledDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
            usp.scheduledDate = usp.scheduledDateTime;
            console.log(`🔄 [USPReminderCron] Weekly repeat scheduled for: ${usp.scheduledDateTime.toISOString()}`);
          } else if (usp.repeatType === "monthly") {
            const nextDate = new Date(usp.scheduledDateTime);
            nextDate.setMonth(nextDate.getMonth() + 1);
            usp.scheduledDateTime = nextDate;
            usp.scheduledDate = nextDate;
            console.log(`🔄 [USPReminderCron] Monthly repeat scheduled for: ${usp.scheduledDateTime.toISOString()}`);
          } else if (usp.repeatType === "custom" && usp.customDurationMinutes > 0) {
            usp.scheduledDateTime = new Date(now.getTime() + usp.customDurationMinutes * 60 * 1000);
            usp.scheduledDate = usp.scheduledDateTime;
            console.log(`🔄 [USPReminderCron] Custom repeat (${usp.customDurationMinutes}m) scheduled for: ${usp.scheduledDateTime.toISOString()}`);
          } else {
            // One-time reminder completed
            usp.cronFired = true;
            usp.isReminderActive = false;
            console.log(`✅ [USPReminderCron] One-time reminder completed for: ${usp._id}`);
          }

          usp.lastTriggered = now;
          await usp.save();
        } catch (itemErr) {
          console.error(`❌ [USPReminderCron] Error processing USP ${usp._id}:`, itemErr.message);
        }
      }
    } catch (cronErr) {
      console.error("❌ [USPReminderCron] Cron loop error:", cronErr.message);
    } finally {
      isProcessingUSPReminders = false;
    }
  });
};
