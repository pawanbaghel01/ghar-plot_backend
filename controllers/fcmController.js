import User from "../models/user.js";
import Employee from "../models/employeeSchema.js";
import Admin from "../models/adminAuthSchema.js";
import Alert from "../models/alertSchema.js";
import { manageAdminDeviceTokens } from "../utils/deviceTokenHelper.js";
import jwt from "jsonwebtoken";

// Save Token Controller for Users
export const saveToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Missing userId or fcmToken",
      });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    res.json({
      success: true,
      message: "Token saved successfully",
    });
  } catch (error) {
    console.error("Error saving FCM token:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Save Token Controller for Admins
export const saveAdminToken = async (req, res) => {
  try {
    const {
      adminId,
      fcmToken,
      oldToken,
      deviceId,
      deviceInfo,
      isLoginEvent,
    } = req.body;

    if (!fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Missing fcmToken",
      });
    }

    let targetAdminId = adminId;

    // Get Admin ID from JWT if not provided
    if (
      (!targetAdminId || targetAdminId === "admin") &&
      req.headers.authorization
    ) {
      try {
        const token = req.headers.authorization.replace("Bearer ", "");
        const decoded = jwt.decode(token);

        if (decoded && (decoded.id || decoded._id)) {
          targetAdminId = decoded.id || decoded._id;
        }
      } catch (_) {}
    }

    // Find Admin
    let admin = null;

    if (
      typeof targetAdminId === "string" &&
      /^[0-9a-fA-F]{24}$/.test(targetAdminId)
    ) {
      admin = await Admin.findById(targetAdminId);
    }

    if (!admin && targetAdminId && targetAdminId !== "admin") {
      admin = await Admin.findOne({ email: targetAdminId });
    }

    if (!admin) {
      admin = await Admin.findOne();
    }

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: "Admin not found",
      });
    }

    // Safely update Admin FCM tokens with retry mechanism
    let savedAdmin = null;
    const maxRetries = 5;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      const freshAdmin = await Admin.findById(admin._id);

      if (!freshAdmin) {
        throw new Error("Admin not found during FCM token update");
      }

      await manageAdminDeviceTokens(freshAdmin, {
        fcmToken,
        oldToken,
        deviceId,
        deviceInfo: deviceInfo || req.headers["user-agent"] || "",
        isLoginEvent:
          isLoginEvent === true || isLoginEvent === "true",
        maxDevices: 5,
      });

      try {
        await freshAdmin.save();

        savedAdmin = freshAdmin;
        break;
      } catch (error) {
        if (
          error.name !== "VersionError" ||
          attempt === maxRetries
        ) {
          throw error;
        }

        console.log(
          `⚠️ FCM token update conflict. Retrying (${attempt}/${maxRetries})...`
        );
      }
    }

    if (!savedAdmin) {
      throw new Error("Unable to save admin FCM token");
    }

    admin = savedAdmin;

    // Clear this specific token from other employees
    await Employee.updateMany(
      { "fcmTokens.token": fcmToken },
      { $pull: { fcmTokens: { token: fcmToken } } }
    );

    await Employee.updateMany(
      { fcmToken: fcmToken },
      { $set: { fcmToken: "" } }
    );

    // Update all alerts for this Admin
    try {
      const updateResult = await Alert.updateMany(
        { userId: admin._id },
        { $set: { fcmToken: admin.fcmToken } }
      );

      if (updateResult.modifiedCount > 0) {
        console.log(
          `✅ Updated ${updateResult.modifiedCount} alerts with new FCM token for admin ${admin._id}`
        );
      }
    } catch (alertError) {
      console.error(
        "Error updating alerts with FCM token:",
        alertError.message
      );
    }

    console.log(
      `✅ FCM token saved/refreshed for admin ${
        admin.email || admin._id
      } (${admin.fcmTokens.length} active devices)`
    );

    return res.json({
      success: true,
      message: "Admin token saved successfully",
      activeDevices: admin.fcmTokens.length,
    });
  } catch (error) {
    console.error("Error saving admin FCM token:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// Save Token Controller for Employees
export const saveEmployeeToken = async (req, res) => {
  try {
    const {
      employeeId,
      fcmToken,
      oldToken,
      deviceId,
      deviceInfo,
    } = req.body;

    if (!employeeId || !fcmToken) {
      return res.status(400).json({
        success: false,
        message: "Missing employeeId or fcmToken",
      });
    }

    const employee = await Employee.findById(employeeId);

    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Initialize fcmTokens if empty but legacy fcmToken exists
    if (
      (!employee.fcmTokens || employee.fcmTokens.length === 0) &&
      employee.fcmToken
    ) {
      employee.fcmTokens = [
        {
          token: employee.fcmToken,
          deviceId: "",
          deviceInfo: "",
          lastLogin:
            employee.lastLogin || employee.updatedAt || new Date(),
          updatedAt: new Date(),
        },
      ];
    }

    if (!employee.fcmTokens) {
      employee.fcmTokens = [];
    }

    // Matching hierarchy:
    // 1. Match by deviceId
    // 2. Match by oldToken
    // 3. Match by current fcmToken
    let matchedEntry = null;

    if (deviceId) {
      matchedEntry = employee.fcmTokens.find(
        (entry) => entry.deviceId && entry.deviceId === deviceId
      );
    }

    if (!matchedEntry && oldToken) {
      matchedEntry = employee.fcmTokens.find(
        (entry) => entry.token === oldToken
      );
    }

    if (!matchedEntry) {
      matchedEntry = employee.fcmTokens.find(
        (entry) => entry.token === fcmToken
      );
    }

    if (matchedEntry) {
      // Refresh existing device token
      matchedEntry.token = fcmToken;
      matchedEntry.updatedAt = new Date();

      if (deviceId) {
        matchedEntry.deviceId = deviceId;
      }

      if (deviceInfo) {
        matchedEntry.deviceInfo = deviceInfo;
      }
    } else {
      // New device
      if (employee.fcmTokens.length < 2) {
        employee.fcmTokens.push({
          token: fcmToken,
          deviceId: deviceId || "",
          deviceInfo:
            deviceInfo || req.headers["user-agent"] || "",
          lastLogin: new Date(),
          updatedAt: new Date(),
        });
      } else {
        employee.fcmTokens.sort(
          (a, b) =>
            new Date(b.lastLogin || 0) -
            new Date(a.lastLogin || 0)
        );

        employee.fcmTokens[1].token = fcmToken;
        employee.fcmTokens[1].updatedAt = new Date();

        if (deviceId) {
          employee.fcmTokens[1].deviceId = deviceId;
        }

        if (deviceInfo) {
          employee.fcmTokens[1].deviceInfo = deviceInfo;
        }
      }
    }

    // Sort by lastLogin descending
    employee.fcmTokens.sort(
      (a, b) =>
        new Date(b.lastLogin || 0) -
        new Date(a.lastLogin || 0)
    );

    // Keep maximum 2 devices
    employee.fcmTokens = employee.fcmTokens.slice(0, 2);

    // Synchronize primary fcmToken
    if (employee.fcmTokens.length > 0) {
      employee.fcmToken = employee.fcmTokens[0].token;
    }

    await employee.save();

    // Clear stale token from other employees
    await Employee.updateMany(
      {
        _id: { $ne: employeeId },
        "fcmTokens.token": fcmToken,
      },
      {
        $pull: { fcmTokens: { token: fcmToken } },
      }
    );

    await Employee.updateMany(
      {
        _id: { $ne: employeeId },
        fcmToken: fcmToken,
      },
      {
        $set: { fcmToken: "" },
      }
    );

    console.log(
      `✅ FCM token saved/refreshed for employee ${employeeId} (${employee.fcmTokens.length} active devices)`
    );

    return res.json({
      success: true,
      message: "Employee token saved successfully",
      activeDevices: employee.fcmTokens.length,
    });
  } catch (error) {
    console.error("Error saving employee FCM token:", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
