import cron from "node-cron";
import Alert from "../models/alertSchema.js";
import Admin from "../models/adminAuthSchema.js";
import Employee from "../models/employeeSchema.js";
import { sendPushNotification } from "../utils/sendNotification.js";

let isProcessingAlerts = false;

// export const initAlertCron = () => {
//   console.log("⏰ Alert cron initialized");

//   // Check alerts every minute
//   cron.schedule("* * * * *", async () => {
//     if (isProcessingAlerts) {
//       console.log("⏳ [Alert-Cron] Previous job still processing, skipping...");
//       return;
//     }

//     try {
//       isProcessingAlerts = true;
//       const now = new Date();

//       // Find alerts where scheduledDateTime is due, isActive is true, and it has an fcmToken
//       // We'll use lastTriggered to avoid double triggering.
//       const dueAlerts = await Alert.find({
//         isActive: true,
//         scheduledDateTime: { $lte: now },
//         fcmToken: { $ne: null }
//       });

//       let triggerCount = 0;

//       for (const alert of dueAlerts) {
//         // 🔥 SAFETY: Double-check alert still exists and is active (prevent deleted alerts)
//         const freshAlert = await Alert.findById(alert._id);
//         if (!freshAlert || !freshAlert.isActive) {
//           console.log(`⚠️ [Alert-Cron] SKIP: Alert ${alert._id} deleted or inactive`);
//           continue;
//         }

//         // Simple double trigger check using lastTriggered
//         // Prevent re-triggering within 30s (guards against same-tick duplicates without blocking 1-min custom intervals)
//         if (alert.lastTriggered && (now - alert.lastTriggered) < 30 * 1000) {
//           continue;
//         }

//         try {
//           const alertDateStr = alert.date ? new Date(alert.date).toISOString().split('T')[0] : "";
//           const alertTimeStr = alert.time || "";
//           const scheduledDTStr = alert.scheduledDateTime ? alert.scheduledDateTime.toISOString() : "";

//           // ⏱️ DEBUG: Calculate delay between scheduledDateTime and actual trigger time
//           const scheduledTime = new Date(alert.scheduledDateTime);
//           const delayMs = now.getTime() - scheduledTime.getTime();
//           const delaySec = (delayMs / 1000).toFixed(1);

//           console.log(`\n========================================`);
//           console.log(`🚀 [Alert-Cron] TRIGGERING Alert`);
//           console.log(`   📌 ID         : ${alert._id}`);
//           console.log(`   📝 Title      : "${alert.title}"`);
//           console.log(`   📅 Scheduled  : ${scheduledTime.toISOString()} (IST: ${scheduledTime.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
//           console.log(`   ⏰ Fired At   : ${now.toISOString()} (IST: ${now.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
//           console.log(`   ⏱️ Delay      : ${delaySec}s after scheduled time`);
//           console.log(`   🔁 Repeat     : ${alert.repeatFrequency || 'none'} | customMins: ${alert.repeatMetadata?.customIntervalMinutes || 'N/A'}`);
//           console.log(`   📱 FCM Token  : ${alert.fcmToken ? alert.fcmToken.substring(0, 20) + '...' : 'NULL'}`);
//           console.log(`========================================\n`);

//           // 🔥 FIX: Handle ALL repeat frequencies properly
//           if (alert.repeatDaily) {
//             // repeatDaily: Add 1 day to scheduledDateTime
//             alert.scheduledDateTime = new Date(alert.scheduledDateTime.getTime() + 24 * 60 * 60 * 1000);
//             alert.date = new Date(alert.date.getTime() + 24 * 60 * 60 * 1000);
//             console.log(`🔄 [Alert-Cron] repeatDaily: Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else if (alert.repeatFrequency === '1 min' || alert.repeatFrequency === '1_min') {
//             // Nagging mode (every 1 min): advance scheduledDateTime by 1 min so query won't match again early
//             alert.scheduledDateTime = new Date(now.getTime() + 60 * 1000);
//             console.log(`🔄 [Alert-Cron] 1 min nagging mode: Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else if (alert.repeatFrequency === 'custom' && alert.repeatMetadata?.customIntervalMinutes) {
//             // 🔥 Custom interval: Add customIntervalMinutes from NOW (not from old scheduledDateTime)
//             // Using now prevents cascade-firing when an alert was missed/delayed
//             const intervalMs = alert.repeatMetadata.customIntervalMinutes * 60 * 1000;
//             const nextTrigger = new Date(now.getTime() + intervalMs);
//             nextTrigger.setMilliseconds(0); // floor ms to avoid cron missing by few ms
//             alert.scheduledDateTime = nextTrigger;
//             console.log(`🔄 [Alert-Cron] Custom repeat (${alert.repeatMetadata.customIntervalMinutes} mins): Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else if (alert.repeatFrequency === 'weekly') {
//             // Weekly: Add 7 days
//             alert.scheduledDateTime = new Date(alert.scheduledDateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
//             alert.date = new Date(alert.date.getTime() + 7 * 24 * 60 * 60 * 1000);
//             console.log(`🔄 [Alert-Cron] Weekly repeat: Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else if (alert.repeatFrequency === 'monthly') {
//             // Monthly: Add 1 month
//             const nextDate = new Date(alert.scheduledDateTime);
//             nextDate.setMonth(nextDate.getMonth() + 1);
//             alert.scheduledDateTime = nextDate;
//             alert.date = new Date(nextDate);
//             console.log(`🔄 [Alert-Cron] Monthly repeat: Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else if (alert.repeatFrequency === 'hourly') {
//             // Hourly: Add 1 hour
//             alert.scheduledDateTime = new Date(alert.scheduledDateTime.getTime() + 60 * 60 * 1000);
//             console.log(`🔄 [Alert-Cron] Hourly repeat: Next trigger at ${alert.scheduledDateTime.toISOString()}`);
//           } else {
//             // One-time alert (repeatFrequency = 'none' or undefined)
//             alert.isActive = false;
//             console.log(`🔴 [Alert-Cron] One-time alert: Marking inactive`);
//           }

//           alert.lastTriggered = now;
//           await alert.save();

//           // Send Push Notification
//           // Use correct screen/deepLink based on category (alert vs reminder)
//           const isReminder = alert.category === 'reminder';
//           console.log(`📤 [Alert-Cron] Sending FCM push notification for "${alert.title}"...`);
//           const fcmStart = Date.now();
//           await sendPushNotification(
//             alert.fcmToken,
//             alert.title || (isReminder ? "New Reminder" : "New Alert"),
//             alert.reason || (isReminder ? "Your reminder has been triggered" : "Your alert has been triggered"),
//             {
//               alertId: alert._id.toString(),
//               reason: alert.reason || "",
//               date: alertDateStr,
//               time: alertTimeStr,
//               scheduledDateTime: scheduledDTStr,
//               repeatDaily: String(alert.repeatDaily),
//               repeatFrequency: alert.repeatFrequency || "none",
//               category: alert.category || "alert",
//               screen: isReminder ? "EditReminderScreen" : "EditAlertScreen",
//               deepLink: isReminder ? "gharplot://editReminder" : "gharplot://editAlert"
//             }
//           );
//           const fcmEnd = Date.now();
//           console.log(`✅ [Alert-Cron] FCM sent successfully for "${alert.title}" | FCM took: ${fcmEnd - fcmStart}ms | Total delay from scheduled: ${delaySec}s`);

//           triggerCount++;
//         } catch (innerError) {
//           console.error(`❌ [Alert-Cron] Error processing alert ${alert._id}:`, innerError.message);
//         }
//       }

//       if (triggerCount > 0) {
//         console.log(`📊 [Alert-Cron] Triggered ${triggerCount} alerts.`);
//       }

//     } catch (error) {
//       console.error("❌ [Alert-Cron] Error checking alerts:", error);
//     } finally {
//       isProcessingAlerts = false;
//     }
//   });
// };

export const initAlertCron = () => {
  console.log("⏰ Alert cron initialized");

  cron.schedule("* * * * *", async () => {
    if (isProcessingAlerts) {
      console.log("⏳ Previous job still running...");
      return;
    }

    try {
      isProcessingAlerts = true;
      const now = new Date();

      const dueAlerts = await Alert.find({
        isActive: true,
        scheduledDateTime: { $lte: now },
        fcmToken: { $ne: null }
      });

      for (const alert of dueAlerts) {
        const freshAlert = await Alert.findById(alert._id);
        if (!freshAlert || !freshAlert.isActive) continue;

        if (alert.lastTriggered && (now - alert.lastTriggered) < 30 * 1000) {
          continue;
        }

        try {
          const isReminder = alert.category === "reminder";

          // ✅ CURRENT SCHEDULE TIME
          const scheduledAt = alert.scheduledDateTime
            ? alert.scheduledDateTime.toISOString()
            : "";

          let nextScheduledTime = null;

          // =========================
          // 🔁 REPEAT LOGIC
          // 🔥 FIX: Check repeatFrequency FIRST — repeatDaily flag is legacy fallback
          // Without this fix, custom 180-min reminders with repeatDaily:true
          // were getting +24h instead of +3h because repeatDaily was checked first
          // =========================
          if (alert.repeatFrequency === "daily") {
            nextScheduledTime = new Date(
              alert.scheduledDateTime.getTime() + 24 * 60 * 60 * 1000
            );
            alert.scheduledDateTime = nextScheduledTime;
            alert.date = nextScheduledTime;
          }
          else if (alert.repeatFrequency === "1 min" || alert.repeatFrequency === "1_min") {
            nextScheduledTime = new Date(now.getTime() + 60 * 1000);
            alert.scheduledDateTime = nextScheduledTime;
          }
          else if (alert.repeatFrequency === "custom" && alert.repeatMetadata?.customIntervalMinutes) {
            const intervalMs = alert.repeatMetadata.customIntervalMinutes * 60 * 1000;
            nextScheduledTime = new Date(now.getTime() + intervalMs);
            nextScheduledTime.setMilliseconds(0);
            alert.scheduledDateTime = nextScheduledTime;
          }
          else if (alert.repeatFrequency === "weekly") {
            nextScheduledTime = new Date(
              alert.scheduledDateTime.getTime() + 7 * 24 * 60 * 60 * 1000
            );
            alert.scheduledDateTime = nextScheduledTime;
            alert.date = nextScheduledTime;
          }
          else if (alert.repeatFrequency === "monthly") {
            const nextDate = new Date(alert.scheduledDateTime);
            nextDate.setMonth(nextDate.getMonth() + 1);
            nextScheduledTime = nextDate;
            alert.scheduledDateTime = nextDate;
            alert.date = nextDate;
          }
          else if (alert.repeatFrequency === "hourly") {
            nextScheduledTime = new Date(
              alert.scheduledDateTime.getTime() + 60 * 60 * 1000
            );
            alert.scheduledDateTime = nextScheduledTime;
          }
          else if (alert.repeatDaily) {
            // 🔥 Legacy fallback: repeatDaily flag with no specific repeatFrequency
            nextScheduledTime = new Date(
              alert.scheduledDateTime.getTime() + 24 * 60 * 60 * 1000
            );
            alert.scheduledDateTime = nextScheduledTime;
            alert.date = nextScheduledTime;
          }
          else {
            // ❌ One-time alert
            alert.isActive = false;
          }

          alert.lastTriggered = now;
          await alert.save();

          // =========================
          // 📤 PUSH NOTIFICATION (Multi-device dynamic recipient resolution)
          // =========================
          let recipientTokens = [];
          if (alert.userId) {
            try {
              const adminUser = await Admin.findById(alert.userId).select("fcmTokens fcmToken");
              if (adminUser) {
                recipientTokens = adminUser.fcmTokens?.length
                  ? adminUser.fcmTokens.map(t => t.token || t)
                  : (adminUser.fcmToken ? [adminUser.fcmToken] : []);
              } else {
                const empUser = await Employee.findById(alert.userId).select("fcmTokens fcmToken");
                if (empUser) {
                  recipientTokens = empUser.fcmTokens?.length
                    ? empUser.fcmTokens.map(t => t.token || t)
                    : (empUser.fcmToken ? [empUser.fcmToken] : []);
                }
              }
            } catch (userLookupErr) {
              console.warn("⚠️ [Alert-Cron] User token lookup failed, falling back to alert.fcmToken:", userLookupErr.message);
            }
          }

          // Fallback to stored alert.fcmToken if no user tokens found
          if (!recipientTokens.length && alert.fcmToken) {
            recipientTokens = [alert.fcmToken];
          }

          if (recipientTokens.length > 0) {
            await sendPushNotification(
              recipientTokens,
              alert.title || (isReminder ? "New Reminder" : "New Alert"),
              alert.reason || (isReminder ? "Your reminder triggered" : "Your alert triggered"),
              {
                type: "admin_reminder",

                alertId: alert._id.toString(),
                title: alert.title || "",
                body: alert.reason || "",

                reminderTitle: alert.title || "",
                note: alert.reason || "",

                // ✅ Fields used by sendPushNotification template (were empty before)
                reason: alert.reason || "",
                date: alert.date ? new Date(alert.date).toISOString().split('T')[0] : "",
                time: alert.time || "",
                scheduledDateTime: alert.scheduledDateTime
                  ? new Date(alert.scheduledDateTime).toISOString()
                  : scheduledAt || "",

                // ✅ CURRENT TIME
                scheduledAt: scheduledAt,

                // ✅ NEXT TIME (IMPORTANT)
                nextScheduledAt: nextScheduledTime
                  ? nextScheduledTime.toISOString()
                  : "",

                repeatFrequency: alert.repeatFrequency || "none",
                repeatDaily: String(alert.repeatDaily || false),
                repeatMetadata: typeof alert.repeatMetadata === 'object' ? JSON.stringify(alert.repeatMetadata) : String(alert.repeatMetadata || ""),
                customRepeatMinutes: String(alert.repeatMetadata?.customIntervalMinutes || alert.customIntervalMinutes || alert.customRepeatMinutes || alert.repeatInterval || ""),
                customIntervalMinutes: String(alert.repeatMetadata?.customIntervalMinutes || alert.customIntervalMinutes || alert.customRepeatMinutes || alert.repeatInterval || ""),

                category: alert.category || "alert",

                // navigation
                screen: isReminder ? "EditReminderScreen" : "EditAlertScreen",
                deepLink: isReminder
                  ? "gharplot://editReminder"
                  : "gharplot://editAlert",

                // extra
                isDue: "true",
                timestamp: String(Date.now())
              }
            );
            console.log(`✅ Notification sent to ${recipientTokens.length} device(s): ${alert.title}`);
          } else {
            console.warn(`⚠️ [Alert-Cron] No active FCM tokens found for alert: ${alert.title}`);
          }
        } catch (err) {
          console.error("❌ Error processing alert:", err.message);
        }
      }
    } catch (error) {
      console.error("❌ Cron error:", error);
    } finally {
      isProcessingAlerts = false;
    }
  });
};