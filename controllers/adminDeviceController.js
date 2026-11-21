import mongoose from "mongoose";
import Admin from "../models/adminAuthSchema.js";
import AdminDevice from "../models/adminDeviceSchema.js";
import Employee from "../models/employeeSchema.js";
import Alert from "../models/alertSchema.js";
import { validateFcmToken } from "../utils/deviceTokenHelper.js";

const MAX_ACTIVE_DEVICES = 5;

/**
 * Synchronize Admin.fcmTokens and Admin.fcmToken from active AdminDevice documents.
 * Ensures 100% backward compatibility for all legacy systems.
 */
export const syncAdminModelFromDevices = async (adminId) => {
  try {
    const activeDevices = await AdminDevice.find({
      userId: adminId,
      isActive: true,
    }).sort({ lastLoginAt: -1, updatedAt: -1 });

    const fcmTokens = activeDevices.map((d) => ({
      token: d.fcmToken,
      deviceId: d.installationId || d.platformDeviceId || "",
      deviceInfo: d.deviceName || `${d.platform} App`,
      lastLogin: d.lastLoginAt || new Date(),
      updatedAt: d.tokenUpdatedAt || new Date(),
    }));

    const primaryToken = activeDevices.length > 0 ? activeDevices[0].fcmToken : "";

    await Admin.findByIdAndUpdate(adminId, {
      $set: {
        fcmTokens: fcmTokens,
        fcmToken: primaryToken,
      },
    });

    // Sync active alerts
    if (primaryToken) {
      await Alert.updateMany(
        { userId: adminId },
        { fcmToken: primaryToken }
      ).catch((err) => console.warn("Alert fcmToken sync warning:", err.message));
    }
  } catch (error) {
    console.error("❌ Error syncing Admin model from AdminDevice:", error.message);
  }
};

/**
 * POST /admin/devices/register
 * Idempotent device registration for Admin
 */
export const registerDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      installationId,
      platformDeviceId = "",
      platform = "unknown",
      deviceName = "",
      fcmToken,
      isLoginEvent = true,
    } = req.body;

    if (!installationId || typeof installationId !== "string" || !installationId.trim()) {
      return res.status(400).json({
        success: false,
        message: "installationId is required",
      });
    }

    if (!fcmToken || typeof fcmToken !== "string" || !fcmToken.trim()) {
      return res.status(400).json({
        success: false,
        message: "fcmToken is required",
      });
    }

    const cleanInstallationId = installationId.trim();
    const cleanPlatformDeviceId = (platformDeviceId || "").trim();
    const cleanFcmToken = fcmToken.trim();
    const normalizedPlatform = ["android", "ios", "web"].includes(String(platform).toLowerCase())
      ? String(platform).toLowerCase()
      : "unknown";

    // 1. Check if installation already exists for this admin
    let device = await AdminDevice.findOne({
      userId,
      installationId: cleanInstallationId,
    });

    // 2. If not found by installationId, check by platformDeviceId (e.g. app reinstalled on same device)
    if (!device && cleanPlatformDeviceId) {
      device = await AdminDevice.findOne({
        userId,
        platformDeviceId: cleanPlatformDeviceId,
        platform: normalizedPlatform,
      });
      if (device) {
        console.log(`🔄 [DeviceManager] Reinstall detected for admin ${userId}: updating installationId`);
        device.installationId = cleanInstallationId; // Upgrade to new installationId
      }
    }

    // 3. Fallback: match by fcmToken if available
    if (!device) {
      device = await AdminDevice.findOne({
        userId,
        fcmToken: cleanFcmToken,
      });
      if (device) {
        device.installationId = cleanInstallationId;
      }
    }

    const now = new Date();

    if (device) {
      // ----------------------------------------------------
      // Update existing device
      // ----------------------------------------------------
      device.fcmToken = cleanFcmToken;
      device.platformDeviceId = cleanPlatformDeviceId || device.platformDeviceId;
      device.platform = normalizedPlatform !== "unknown" ? normalizedPlatform : device.platform;
      if (deviceName) device.deviceName = deviceName.trim();
      device.isActive = true;
      device.tokenUpdatedAt = now;
      device.lastSeenAt = now;
      if (isLoginEvent) {
        device.lastLoginAt = now;
      }
      await device.save();
      console.log(`📱 [DeviceManager] Updated device: ${device.installationId} for Admin ${userId}`);
    } else {
      // ----------------------------------------------------
      // New Device: Enforce device limit of 5
      // ----------------------------------------------------
      const activeDevices = await AdminDevice.find({
        userId,
        isActive: true,
      }).sort({ lastLoginAt: 1, lastSeenAt: 1 }); // oldest first

      if (activeDevices.length >= MAX_ACTIVE_DEVICES) {
        console.log(`⚠️ [DeviceManager] Admin ${userId} reached active device limit (${activeDevices.length}/${MAX_ACTIVE_DEVICES}). Validating/evicting oldest.`);

        let evicted = false;
        // Check if any existing device has a confirmed dead token
        for (const existingDev of activeDevices) {
          const check = await validateFcmToken(existingDev.fcmToken);
          if (!check.valid) {
            existingDev.isActive = false;
            await existingDev.save();
            console.log(`🧹 [DeviceManager] Evicted dead token device ${existingDev._id} (${existingDev.installationId})`);
            evicted = true;
            break;
          }
        }

        // If all existing tokens are valid, deactivate the oldest eligible device
        if (!evicted) {
          const oldestDevice = activeDevices[0];
          oldestDevice.isActive = false;
          await oldestDevice.save();
          console.log(`🚪 [DeviceManager] Evicted oldest active device ${oldestDevice._id} (${oldestDevice.installationId}) to accommodate new device`);
        }
      }

      // Create new device record
      device = new AdminDevice({
        userId,
        installationId: cleanInstallationId,
        platformDeviceId: cleanPlatformDeviceId,
        platform: normalizedPlatform,
        deviceName: (deviceName || `${normalizedPlatform} App`).trim(),
        fcmToken: cleanFcmToken,
        isActive: true,
        lastLoginAt: now,
        lastSeenAt: now,
        tokenUpdatedAt: now,
      });

      await device.save();
      console.log(`✅ [DeviceManager] Registered new device: ${device.installationId} for Admin ${userId}`);
    }

    // 4. Global token cleanup: Remove this token from any other accounts (e.g. employee accounts on shared device)
    await Employee.updateMany(
      { "fcmTokens.token": cleanFcmToken },
      { $pull: { fcmTokens: { token: cleanFcmToken } } }
    ).catch(() => {});
    await Employee.updateMany(
      { fcmToken: cleanFcmToken },
      { $set: { fcmToken: "" } }
    ).catch(() => {});

    // Deactivate this token in AdminDevice if associated with another admin user
    await AdminDevice.updateMany(
      { userId: { $ne: userId }, fcmToken: cleanFcmToken },
      { $set: { isActive: false } }
    ).catch(() => {});

    // 5. Synchronize legacy fields on Admin model
    await syncAdminModelFromDevices(userId);

    const activeCount = await AdminDevice.countDocuments({
      userId,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: "Device registered successfully",
      device: {
        id: device._id,
        installationId: device.installationId,
        platform: device.platform,
        deviceName: device.deviceName,
        isActive: device.isActive,
        lastLoginAt: device.lastLoginAt,
        lastSeenAt: device.lastSeenAt,
      },
      activeDevicesCount: activeCount,
      maxDevices: MAX_ACTIVE_DEVICES,
    });
  } catch (error) {
    console.error("❌ Error in registerDevice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to register device",
      error: error.message,
    });
  }
};

/**
 * POST /admin/devices/heartbeat
 * Periodic lightweight touch to record lastSeenAt
 */
export const deviceHeartbeat = async (req, res) => {
  try {
    const userId = req.user.id;
    const { installationId, platformDeviceId, fcmToken } = req.body;

    const query = { userId, isActive: true };
    if (installationId) {
      query.installationId = installationId.trim();
    } else if (platformDeviceId) {
      query.platformDeviceId = platformDeviceId.trim();
    } else if (fcmToken) {
      query.fcmToken = fcmToken.trim();
    } else {
      return res.status(400).json({
        success: false,
        message: "installationId, platformDeviceId, or fcmToken is required",
      });
    }

    const device = await AdminDevice.findOneAndUpdate(
      query,
      { $set: { lastSeenAt: new Date() } },
      { new: true }
    );

    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Active device not found for heartbeat",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Heartbeat acknowledged",
      lastSeenAt: device.lastSeenAt,
    });
  } catch (error) {
    console.error("❌ Error in deviceHeartbeat:", error.message);
    return res.status(500).json({
      success: false,
      message: "Heartbeat failed",
      error: error.message,
    });
  }
};

/**
 * POST /admin/devices/logout
 * Deactivates ONLY the calling device
 */
export const logoutDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { installationId, platformDeviceId, fcmToken } = req.body;

    const query = { userId };
    const orConditions = [];

    if (installationId && installationId.trim()) {
      orConditions.push({ installationId: installationId.trim() });
    }
    if (platformDeviceId && platformDeviceId.trim()) {
      orConditions.push({ platformDeviceId: platformDeviceId.trim() });
    }
    if (fcmToken && fcmToken.trim()) {
      orConditions.push({ fcmToken: fcmToken.trim() });
    }

    if (orConditions.length > 0) {
      query.$or = orConditions;
    }

    const device = await AdminDevice.findOne(query);

    if (device) {
      device.isActive = false;
      device.lastSeenAt = new Date();
      await device.save();
      console.log(`🚪 [DeviceManager] Deactivated device ${device.installationId} on logout for Admin ${userId}`);
    }

    // Keep Admin model in sync
    await syncAdminModelFromDevices(userId);

    const remainingCount = await AdminDevice.countDocuments({
      userId,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: "Device logged out successfully",
      remainingDevices: remainingCount,
    });
  } catch (error) {
    console.error("❌ Error in logoutDevice:", error);
    return res.status(500).json({
      success: false,
      message: "Device logout failed",
      error: error.message,
    });
  }
};

/**
 * GET /admin/devices
 * Lists active and recent devices for current authenticated admin
 */
export const getAdminDevices = async (req, res) => {
  try {
    const userId = req.user.id;
    const devices = await AdminDevice.find({ userId })
      .sort({ isActive: -1, lastLoginAt: -1 })
      .select("-fcmToken -__v")
      .lean();

    return res.status(200).json({
      success: true,
      devices,
      maxDevices: MAX_ACTIVE_DEVICES,
    });
  } catch (error) {
    console.error("❌ Error in getAdminDevices:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch devices",
      error: error.message,
    });
  }
};

/**
 * DELETE /admin/devices/:id
 * Explicit device revocation by device document _id
 */
export const revokeAdminDevice = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid device ID",
      });
    }

    const device = await AdminDevice.findOne({ _id: id, userId });
    if (!device) {
      return res.status(404).json({
        success: false,
        message: "Device not found or unauthorized",
      });
    }

    device.isActive = false;
    await device.save();

    await syncAdminModelFromDevices(userId);

    const remainingCount = await AdminDevice.countDocuments({
      userId,
      isActive: true,
    });

    return res.status(200).json({
      success: true,
      message: "Device revoked successfully",
      remainingDevices: remainingCount,
    });
  } catch (error) {
    console.error("❌ Error in revokeAdminDevice:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to revoke device",
      error: error.message,
    });
  }
};
