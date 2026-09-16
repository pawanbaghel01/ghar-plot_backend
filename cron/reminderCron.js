import cron from "node-cron";
import Reminder from "../models/reminderSchema.js";
import Notification from "../models/notificationModel.js";
import { sendReminderNotification, sendAdminReminderNotification, sendEmployeeDueReminderNotification } from "../utils/fcmNotificationService.js";

// We'll use a local variable for io to be set during initialization
let socketIo;
let isProcessing = false;

export const initReminderCron = (io) => {
  socketIo = io;
  console.log("⏰ Reminder cron initialized - FCM notifications enabled");

  // Check reminders every 30 seconds for near-real-time FCM delivery
  cron.schedule("*/30 * * * * *", async () => {
    if (isProcessing) {
      console.log("⏳ [Cron] Previous job still processing, skipping this tick...");
      return;
    }

    try {
      isProcessing = true;
      console.log("🔍 [Cron] Checking reminders...");
      const now = new Date();
      console.log(`⏰ [Cron] Current Time (UTC): ${now.toISOString()}`);

      const allActive = await Reminder.countDocuments({ isActive: true, status: { $nin: ['completed', 'dismissed'] }, cronFired: { $ne: true } });
      console.log(`� [Cron] Total active/ready reminders in DB: ${allActive}`);

      const reminders = await Reminder.find({
        isActive: true,
        status: { $nin: ['completed', 'dismissed'] },
        cronFired: { $ne: true },
        $or: [
          { status: 'pending', reminderDateTime: { $lte: now }, isRepeating: { $ne: true } },
          { status: 'snoozed', snoozedUntil: { $lte: now } },
          { isRepeating: true, nextTrigger: { $lte: now } }
        ]
      }).populate('employeeId', 'name email fcmToken adminReminderPopupEnabled');

      console.log(`📋 [Cron] Found ${reminders.length} reminders in DB that match query`);
      let triggerCount = 0, skipCount = 0;


      for (const r of reminders) {
        try {
          // 🔥 SAFETY: Double-check reminder still exists and not dismissed (prevent deleted reminders)
          const freshReminder = await Reminder.findById(r._id);
          if (!freshReminder || freshReminder.status === 'dismissed' || freshReminder.status === 'completed' || !freshReminder.isActive) {
            console.log(`⚠️ [Reminder-Cron] SKIP: Reminder ${r._id} deleted/dismissed/completed/inactive`);
            continue;
          }
          
          // cronFired reminders are already excluded at query level
          // Just double-check time conditions
          let shouldTrigger = false;
          let reason = "";

          if (r.status === 'pending' && !r.isRepeating) {
            const scheduledTime = new Date(r.reminderDateTime);
            if (now >= scheduledTime) {
              shouldTrigger = true;
              reason = "Pending & Due";
            }
          } else if (r.status === 'snoozed') {
            const snoozeTime = new Date(r.snoozedUntil);
            if (now >= snoozeTime) {
              shouldTrigger = true;
              reason = "Snoozed & Due";
            }
          }

          if (r.isRepeating && r.isActive) {
            const nextTrigger = new Date(r.nextTrigger);
            if (now >= nextTrigger) {
              shouldTrigger = true;
              reason = "Repeating & Due";
            }
          }

          if (!shouldTrigger) {
            skipCount++;
            // Debug: log recently-created reminders being skipped
            const recentlyCreated = r.createdAt && (now - new Date(r.createdAt)) < 10 * 60 * 1000;
            if (recentlyCreated) {
              const sched = r.reminderDateTime ? new Date(r.reminderDateTime) : null;
              console.log(`🔴 SKIP-DEBUG: "${r.title}" | status=${r.status} | reminderDT=${sched?.toISOString() || 'NULL'} | cronFired=${r.cronFired} | now=${now.toISOString()} | now>=sched=${sched ? now >= sched : 'N/A'}`);
            }
            continue;
          }

          // � Prevent rapid double-firing for the same reminder (e.g. cron ticks at 30s intervals)
          if (r.lastTriggered) {
            const msSinceLastTrigger = now.getTime() - new Date(r.lastTriggered).getTime();
            if (msSinceLastTrigger < 30 * 1000) {
              skipCount++;
              console.log(`⚠️ [ReminderCron] Skipping ${r._id} (last triggered ${Math.round(msSinceLastTrigger/1000)}s ago)`);
              continue;
            }
          }

          // �🚀 Custom Nagging feature: Throttle so it fires only every N minutes
          let naggingMinutes = 0;
          if (r.repeatType === 'custom' && r.customRepeatMinutes > 0) {
              naggingMinutes = r.customRepeatMinutes;
          } else if (r.repeatType && typeof r.repeatType === 'string' && r.repeatType.includes('min')) {
              naggingMinutes = parseInt(r.repeatType) || 0;
          }

          const isNagging = naggingMinutes > 0;
          if (isNagging && r.lastTriggered) {
             const msSinceLast = now.getTime() - new Date(r.lastTriggered).getTime();
             if (msSinceLast < naggingMinutes * 60 * 1000) {
                 skipCount++;
                 continue; // skip this tick, hasn't been N full minutes yet
             }
          }

          triggerCount++;
          console.log(`🚀 [Cron] TRIGGERING [${triggerCount}]: "${r.title}" | Reason: ${reason} | emp=${r.employeeId?.name}`);
          console.log(`📬 Processing reminder: ${r.title}`);

          // ✅ Check if employee is also an admin/sub-admin (adminReminderPopupEnabled = true)
          // If YES → skip employee-only push to avoid duplicate. Admin push below will cover them.
          // If NO  → send employee-specific notifications normally.
          // 1️⃣ Determine notification style for the assignee
          const isAdminAssignee = r.employeeId && r.employeeId.adminReminderPopupEnabled === true;

          // 2️⃣ Create database record for the notification (for the Inbox screen)
          const isOwnReminder = r.employeeId?.adminReminderPopupEnabled !== true;
          
          // 🔥 PREVENT DUPLICATE CRON NOTIFICATIONS
          const existingCronNotification = await Notification.findOne({
            type: isAdminAssignee ? 'admin_reminder' : 'employee_due_reminder',
            'metadata.reminderId': r._id,
            'metadata.employeeId': r.employeeId?._id,
            createdAt: { $gte: new Date(Date.now() - 60 * 1000) } // Within last 1 minute
          });
          
          if (existingCronNotification) {
            console.log(`⚠️ [ReminderCron] Duplicate notification prevented for reminder: ${r._id}`);
            continue; // Skip this reminder
          }
          
          const notification = new Notification({
            title: isAdminAssignee ? `Employee Reminder - ${r.employeeId.name}` : "Reminder Due",
            message: r.title || `Follow up with ${r.clientName || 'Client'}`,
            type: isAdminAssignee ? 'admin_reminder' : 'employee_due_reminder',
            priority: 'high',
            metadata: {
              reminderId: r._id,
              employeeId: r.employeeId?._id,
              employeeName: r.employeeId?.name,
              reminderTitle: r.title,
              clientName: r.clientName,
              phone: r.phone,
              location: r.location,
              note: r.comment,
              reminderTime: r.reminderDateTime,
              isOwnReminder: true
            },
            reminderData: {
              name: r.clientName,
              phone: r.phone,
              location: r.location,
              note: r.comment,
              reminderTime: r.reminderDateTime,
            },
          });
          await notification.save();

          // 3️⃣ Send Socket.io notification (foreground/in-app)
          if (socketIo) {
            const socketData = {
              ...notification.toObject(),
              employeeId: r.employeeId?._id?.toString(),
            };

            // Standard event for inbox update
            socketIo.emit(isAdminAssignee ? "adminReminderNotification" : "newNotification", socketData);

            // 🔥 NEW FLOW: Specific event for the "Due Reminder Design" (Professional ReminderPopup)
            console.log(`📡 Emitting employeeDueReminder socket for assignee: ${r.employeeId?.name || 'Unknown'}`);
            socketIo.emit("employeeDueReminder", {
              ...socketData,
              flowType: "new_reminder_flow",
              senderName: "Reminder Bot",
              displayTitle: "⏰ It's Time!",
              displayMessage: r.title || `Reminder: ${r.clientName}`,
              // Fields for ReminderPopup.js
              id: r._id,
              name: r.clientName || "N/A",
              title: r.title || "Reminder",
              note: r.comment || "",
              phone: r.phone || "",
              contactNumber: r.phone || "",
              location: r.location || "",
              enquiryId: r.enquiryId?._id || r.enquiryId || r._id,
              reminderDateTime: r.reminderDateTime,
              assignmentType: 'enquiry',
              status: 'pending'
            });
          }

          // 4️⃣ & 5️⃣ Send Notifications
          const triggerTime = r.status === 'snoozed' ? new Date(r.snoozedUntil) : (r.isRepeating ? new Date(r.nextTrigger) : new Date(r.reminderDateTime));
          const diffMinutes = (now - triggerTime) / (1000 * 60);

          if (r.employeeId) {
            if (diffMinutes > 15) {
              console.log(`⏩ Skipping push notifications for heavily delayed reminder: ${r.title} (${diffMinutes.toFixed(1)} mins old)`);
            } else {
              const assigneeId = r.employeeId._id;
              const isAdminWatching = r.employeeId.adminReminderPopupEnabled === true;

              // A. Send employee_due_reminder to the assignee
              console.log(`📤 Sending FCM to employee assignee: ${r.employeeId.name}`);
              await sendEmployeeDueReminderNotification(assigneeId, {
                reminderId: r._id,
                title: r.title,
                clientName: r.clientName,
                phone: r.phone,
                location: r.location,
                note: r.comment,
                reminderTime: r.reminderDateTime
              });

              // 🔑 Fetch LATEST fcmToken from DB for correct dedup
              // (cron's populate may have stale token if employee refreshed it)
              const freshEmployee = await (await import('../models/employeeSchema.js')).default
                .findById(assigneeId).select('fcmToken email name');
              const latestFcmToken = freshEmployee?.fcmToken || r.employeeId.fcmToken;
              const latestEmail = freshEmployee?.email || r.employeeId.email;

              // B. Alert Admins/Managers
              // 🔑 KEY FIX: Super-admins (Admin collection) only get notified if
              // adminReminderPopupEnabled = true for this employee.
              // Otherwise only direct managers (sub-admins) get notified.
              // This prevents super-admin from getting spammed for EVERY employee's reminder.
              console.log(`📢 Alerting ${isAdminWatching ? 'super-admins + managers' : 'direct managers only'} for ${r.employeeId.name}'s reminder...`);
              await sendAdminReminderNotification(
                {
                  _id: r._id,
                  title: r.title,
                  clientName: r.clientName,
                  phone: r.phone,
                  location: r.location,
                  note: r.comment,
                  reminderTime: r.reminderDateTime,
                  isDue: true, // ✅ Correctly flag as due alert
                },
                {
                  employeeName: r.employeeId.name,
                  employeeEmail: latestEmail,
                  fcmToken: latestFcmToken
                },
                assigneeId,
                true,            // excludeTarget = true (never notify the employee themselves)
                isAdminWatching  // notifySuperAdmins: only if adminReminderPopupEnabled = true
              );
            }
          }

          // 5️⃣ Update reminder tracking
          r.lastTriggered = now;
          r.triggerCount = (r.triggerCount || 0) + 1;

          // 🔒 Mark as cron-fired so it won't be picked up again (race-condition proof)
          if (!r.isRepeating && !isNagging) {
            r.cronFired = true;
          }

          // For repeating reminders, calculate next trigger
          if (r.isRepeating && r.isActive && !isNagging) {
            if (r.status === 'snoozed') {
              r.status = 'pending';
              r.snoozedUntil = null;
            }
            r.calculateNextTrigger();
          } else {
            if (r.status === 'snoozed') {
              r.status = 'pending';
              r.snoozedUntil = null;
            }
          }

          await r.save();
          console.log(`✅ Reminder processed: ${r.title}`);

        } catch (error) {
          console.error(`❌ Error processing reminder ${r._id}:`, error);
        }
      }

      if (triggerCount > 0 || reminders.length > 0) {
        console.log(`📊 [Cron] Done: ${triggerCount} triggered, ${skipCount} skipped, ${reminders.length} total found`);
      }
    } catch (err) {
      console.error("❌ [Cron] Error checking reminders:", err);
    } finally {
      isProcessing = false;
    }
  });

};

console.log("⏰ Reminder cron file loaded");

