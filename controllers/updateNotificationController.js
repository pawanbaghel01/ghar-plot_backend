import User from "../models/user.js";
import { sendPushNotification } from "../utils/sendNotification.js";

export const sendAppUpdateNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    // Find all users who have FCM tokens
    const users = await User.find({ fcmToken: { $exists: true, $ne: "" } });

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No users found with FCM tokens.",
      });
    }

    // Get all tokens
    const tokens = users.map((u) => u.fcmToken);

    // Send notification to all users
    const response = await sendPushNotification(tokens, title, message);

    res.status(200).json({
      success: true,
      message: "App update notification sent to all users!",
      sentCount: response?.successCount || 0,
      failedCount: response?.failureCount || 0,
    });
  } catch (error) {
    console.error("Error sending update notification:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
