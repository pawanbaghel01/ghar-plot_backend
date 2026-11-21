import mongoose from "mongoose";

const adminDeviceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      required: true,
      index: true,
    },
    installationId: {
      type: String,
      required: true,
      trim: true,
    },
    platformDeviceId: {
      type: String,
      default: "",
      trim: true,
    },
    platform: {
      type: String,
      enum: ["android", "ios", "web", "unknown"],
      default: "unknown",
      lowercase: true,
      trim: true,
    },
    deviceName: {
      type: String,
      default: "",
      trim: true,
    },
    fcmToken: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    lastLoginAt: {
      type: Date,
      default: Date.now,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
    tokenUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index: One installationId per admin user
adminDeviceSchema.index({ userId: 1, installationId: 1 }, { unique: true });

// Performance index for notification routing & device limit lookups
adminDeviceSchema.index({ userId: 1, isActive: 1, lastLoginAt: -1 });

// Global FCM token lookup index for de-duplicating / invalidation
adminDeviceSchema.index({ fcmToken: 1 });

const AdminDevice = mongoose.model("AdminDevice", adminDeviceSchema);
export default AdminDevice;
