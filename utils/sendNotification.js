import admin from "../config/firebase.js";

export const sendPushNotification = async (
  fcmToken,
  title,
  body,
  data = {},
  reminderId = null // Pass reminder _id if available
) => {
  try {
    // 🔥 Current time (जब notification trigger हो)
    const now = new Date();
    const formattedTime = now.toISOString();
    // 🔥 FIX: Use raw ms diff (timezone-independent) instead of getHours() which is UTC on Render
    const getPeriod = (nextTime) => {
      if (!nextTime) return "";
      const next = new Date(nextTime);
      if (isNaN(next.getTime())) return "";
      const diffMs = next.getTime() - now.getTime();
      if (diffMs <= 0) return "";
      const diffMinutes = Math.round(diffMs / 60000);
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;
      if (hours > 0 && minutes > 0) {
        return `${hours} hr ${minutes} min`;
      } else if (hours > 0) {
        return `${hours} hr`;
      } else {
        return `${minutes} min`;
      }
    };
    const period = getPeriod(data.nextScheduledAt);
    const message = {
      token: fcmToken,
      data: {
        title: title || "New Alert",
        body: body || "You have a new message",
        deepLink: data.deepLink || "gharplot://editAlert",
        screen: data.screen || "EditAlertScreen",
        alertId: data.alertId || "",
        reason: data.reason || "",
        date: data.date || "",
        time: data.time || "",
        // 🔥 FIX: Use actual scheduledDateTime from cron, not trigger time
        scheduledDateTime: data.scheduledDateTime || formattedTime,
        period: period,
        repeatDaily: String(data.repeatDaily ?? false),
        repeatFrequency: data.repeatFrequency || "none",
        nextScheduledAt: data.nextScheduledAt || "",
        category: data.category || "alert",
        click_action: "FLUTTER_NOTIFICATION_CLICK"
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            "content-available": 1
          }
        }
      }
    };
    const response = await admin.messaging().send(message);
    console.log("✅ Notification sent:", response);
    return response;
  } catch (error) {
    console.error("❌ FCM error:", error);
    // Handle invalid token error
    if (
      error?.errorInfo?.code === "messaging/registration-token-not-registered" &&
      fcmToken &&
      reminderId
    ) {
      try {
        // Remove the invalid token from the reminder document
        await Reminder.findByIdAndUpdate(reminderId, { $unset: { fcmToken: "" } });
        console.log(`Removed invalid FCM token from reminder ${reminderId}`);
      } catch (dbErr) {
        console.error("Failed to remove invalid FCM token from DB:", dbErr);
      }
    }
    throw error;
  }
};