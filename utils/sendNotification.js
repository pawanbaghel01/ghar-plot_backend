import admin from "../config/firebase.js";
import Admin from "../models/adminAuthSchema.js";
import Employee from "../models/employeeSchema.js";
import Reminder from "../models/reminderSchema.js";

/**
 * Prunes an invalid FCM token from Admin and Employee models.
 * Crucially: Only the invalid token is removed. The other active device token
 * is NEVER removed, and primary fcmToken is immediately re-synchronized
 * to the latest remaining valid device (or empty string if none remain).
 */
export const pruneInvalidFcmToken = async (failedToken) => {
  if (!failedToken || typeof failedToken !== "string") return;
  const tokenToPrune = failedToken.trim();
  if (!tokenToPrune) return;

  try {
    // 1. Process Admin collection
    const admins = await Admin.find({
      $or: [{ "fcmTokens.token": tokenToPrune }, { fcmToken: tokenToPrune }]
    });

    for (const adminDoc of admins) {
      const prevCount = adminDoc.fcmTokens?.length || 0;
      adminDoc.fcmTokens = (adminDoc.fcmTokens || []).filter(t => t.token !== tokenToPrune);
      // Re-sort remaining by lastLogin descending
      adminDoc.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
      // Re-sync primary fcmToken to latest active device
      adminDoc.fcmToken = adminDoc.fcmTokens.length > 0 ? adminDoc.fcmTokens[0].token : "";
      await adminDoc.save();
      console.log(`🧹 [FCM-Cleanup] Pruned dead token for Admin: ${adminDoc.email} (${prevCount} -> ${adminDoc.fcmTokens.length} active devices)`);
    }

    // 2. Process Employee collection
    const employees = await Employee.find({
      $or: [{ "fcmTokens.token": tokenToPrune }, { fcmToken: tokenToPrune }]
    });

    for (const empDoc of employees) {
      const prevCount = empDoc.fcmTokens?.length || 0;
      empDoc.fcmTokens = (empDoc.fcmTokens || []).filter(t => t.token !== tokenToPrune);
      empDoc.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
      empDoc.fcmToken = empDoc.fcmTokens.length > 0 ? empDoc.fcmTokens[0].token : "";
      await empDoc.save();
      console.log(`🧹 [FCM-Cleanup] Pruned dead token for Employee: ${empDoc.name} (${prevCount} -> ${empDoc.fcmTokens.length} active devices)`);
    }
  } catch (err) {
    console.error("❌ Error in pruneInvalidFcmToken:", err.message);
  }
};

export const sendPushNotification = async (
  fcmTokenOrTokens,
  title,
  body,
  data = {},
  reminderId = null // Pass reminder _id if available
) => {
  if (!fcmTokenOrTokens) return null;

  // Normalize tokens to an array of distinct non-empty strings
  let tokenList = [];
  if (Array.isArray(fcmTokenOrTokens)) {
    tokenList = fcmTokenOrTokens
      .map(t => (typeof t === "string" ? t : t?.token))
      .filter(t => typeof t === "string" && t.trim().length > 0);
  } else if (typeof fcmTokenOrTokens === "string" && fcmTokenOrTokens.trim().length > 0) {
    tokenList = [fcmTokenOrTokens.trim()];
  }
  tokenList = [...new Set(tokenList)];

  if (tokenList.length === 0) return null;

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

  const isAlert = String(data.category || data.type || "").toLowerCase().includes("alert");
  const channelId = isAlert ? "gharplot_alerts" : "admin_reminders";
  const notifTitle = title || (isAlert ? "New Alert" : "New Reminder");
  const notifBody = body || "You have a new message";

  const buildMessageForToken = (token) => ({
    token: token,
    notification: {
      title: notifTitle,
      body: notifBody,
    },
    data: {
      title: notifTitle,
      body: notifBody,
      deepLink: data.deepLink || "gharplot://editAlert",
      screen: data.screen || "EditAlertScreen",
      alertId: data.alertId || "",
      reason: data.reason || "",
      date: data.date || "",
      time: data.time || "",
      scheduledDateTime: data.scheduledDateTime || formattedTime,
      period: period,
      repeatDaily: String(data.repeatDaily ?? false),
      repeatFrequency: data.repeatFrequency || "none",
      nextScheduledAt: data.nextScheduledAt || "",
      category: data.category || (isAlert ? "alert" : "reminder"),
      click_action: "FLUTTER_NOTIFICATION_CLICK"
    },
    android: {
      priority: "high",
      notification: {
        channelId: channelId,
        sound: "default",
        priority: "max",
        visibility: "public",
        defaultSound: true,
        defaultVibratePattern: true,
        clickAction: "FLUTTER_NOTIFICATION_CLICK"
      }
    },
    apns: {
      payload: {
        aps: {
          alert: {
            title: notifTitle,
            body: notifBody,
          },
          sound: "default",
          badge: 1,
          "content-available": 1
        }
      }
    }
  });

  const sendSingle = async (token) => {
    try {
      const message = buildMessageForToken(token);
      const response = await admin.messaging().send(message);
      console.log(`✅ Notification sent to token ${token.substring(0, 15)}...:`, response);
      return { success: true, token, response };
    } catch (error) {
      console.error(`❌ FCM error for token ${token.substring(0, 15)}...:`, error.message);

      const errorCode = error?.errorInfo?.code || error?.code;
      if (
        errorCode === "messaging/registration-token-not-registered" ||
        errorCode === "messaging/invalid-registration-token" ||
        errorCode === "messaging/invalid-argument"
      ) {
        // Selective pruning of ONLY this invalid token & primary fcmToken re-sync
        await pruneInvalidFcmToken(token);

        if (reminderId) {
          try {
            await Reminder.findByIdAndUpdate(reminderId, { $unset: { fcmToken: "" } });
            console.log(`Removed invalid FCM token from reminder ${reminderId}`);
          } catch (dbErr) {
            console.error("Failed to remove invalid FCM token from reminder DB:", dbErr);
          }
        }
      }

      return { success: false, token, error };
    }
  };

  // If single token (existing regular flow), execute directly
  if (tokenList.length === 1) {
    const res = await sendSingle(tokenList[0]);
    if (!res.success) {
      throw res.error;
    }
    return res.response;
  }

  // If multiple tokens (multi-device flow), send in parallel so one device never delays the other
  const results = await Promise.allSettled(tokenList.map(t => sendSingle(t)));
  const successful = results.filter(r => r.status === "fulfilled" && r.value.success);
  console.log(`📊 Multi-device FCM result: ${successful.length}/${tokenList.length} devices delivered successfully`);

  return successful.length > 0 ? successful[0].value.response : null;
};