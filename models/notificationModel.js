import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    read: { type: Boolean, default: false }, // For bad attendant notifications
    readAt: { type: Date },
    type: { type: String, default: 'general' }, // 'general', 'bad_attendant', etc.
    priority: { type: String, default: 'normal' }, // 'low', 'normal', 'high', 'urgent'
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    reminderData: {
      name: String,
      email: String,
      phone: String,
      location: String,
      note: String,
      reminderTime: Date,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Notification", notificationSchema);
