import Notification from "../models/notificationModel.js";

/**
 * @desc Create a new notification
 */
export const createNotification = async (req, res) => {
  try {
    const { title, message } = req.body;

    const notification = new Notification({ title, message });
    const saved = await notification.save();

    // Emit real-time notification to all connected clients
    req.io.emit("newNotification", saved);

    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error("Error creating notification:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

/**
 * @desc Get all notifications
 */
export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: notifications });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};



/**
 * ✅ Mark Notification as Read
 * PATCH /api/notification/mark-read/:id
 */
export const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification marked as read successfully",
      data: notification,
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      message: "Server error while marking notification as read",
    });
  }
};

/**
 * 🗑️ Delete Notification
 * DELETE /api/notification/:id
 */
export const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    await Notification.findByIdAndDelete(id);

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting notification",
    });
  }
};