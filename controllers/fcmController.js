import User from "../models/user.js";
import Employee from "../models/employeeSchema.js";
import Admin from "../models/adminAuthSchema.js";

//  Save Token Controller for Users
export const saveToken = async (req, res) => {
  try {
    const { userId, fcmToken } = req.body;

    if (!userId || !fcmToken) {
      return res.status(400).json({ success: false, message: "Missing userId or fcmToken" });
    }

    await User.findByIdAndUpdate(userId, { fcmToken });

    res.json({ success: true, message: "Token saved successfully" });
  } catch (error) {
    console.error("Error saving FCM token:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//  Save Token Controller for Admins
export const saveAdminToken = async (req, res) => {
  try {
    const { adminId, fcmToken, oldToken, deviceId, deviceInfo } = req.body;

    if (!adminId || !fcmToken) {
      return res.status(400).json({ success: false, message: "Missing adminId or fcmToken" });
    }

    const admin = await Admin.findById(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // Initialize fcmTokens if empty but legacy fcmToken exists
    if ((!admin.fcmTokens || admin.fcmTokens.length === 0) && admin.fcmToken) {
      admin.fcmTokens = [{
        token: admin.fcmToken,
        deviceId: "",
        deviceInfo: "",
        lastLogin: admin.updatedAt || new Date(),
        updatedAt: new Date()
      }];
    }
    if (!admin.fcmTokens) admin.fcmTokens = [];

    // Matching hierarchy for token refresh:
    // 1. Match by deviceId
    // 2. Match by oldToken
    // 3. Match by token === fcmToken
    let matchedEntry = null;
    if (deviceId) {
      matchedEntry = admin.fcmTokens.find(e => e.deviceId && e.deviceId === deviceId);
    }
    if (!matchedEntry && oldToken) {
      matchedEntry = admin.fcmTokens.find(e => e.token === oldToken);
    }
    if (!matchedEntry) {
      matchedEntry = admin.fcmTokens.find(e => e.token === fcmToken);
    }

    if (matchedEntry) {
      // Token Refresh on known device: update token and updatedAt WITHOUT changing lastLogin!
      matchedEntry.token = fcmToken;
      matchedEntry.updatedAt = new Date();
      if (deviceId) matchedEntry.deviceId = deviceId;
      if (deviceInfo) matchedEntry.deviceInfo = deviceInfo;
    } else {
      // New device or unregistered token refresh
      if (admin.fcmTokens.length < 2) {
        admin.fcmTokens.push({
          token: fcmToken,
          deviceId: deviceId || "",
          deviceInfo: deviceInfo || req.headers["user-agent"] || "",
          lastLogin: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Already has 2 devices. Update the second slot (or oldest)
        admin.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
        admin.fcmTokens[1].token = fcmToken;
        admin.fcmTokens[1].updatedAt = new Date();
        if (deviceId) admin.fcmTokens[1].deviceId = deviceId;
        if (deviceInfo) admin.fcmTokens[1].deviceInfo = deviceInfo;
      }
    }

    // Sort by lastLogin descending to keep priority intact
    admin.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
    admin.fcmTokens = admin.fcmTokens.slice(0, 2);

    // Synchronize primary fcmToken to top active device
    admin.fcmToken = admin.fcmTokens[0].token;

    await admin.save();

    // Clear this specific token from other employees if it was reassigned to admin
    await Employee.updateMany(
      { "fcmTokens.token": fcmToken },
      { $pull: { fcmTokens: { token: fcmToken } } }
    );
    await Employee.updateMany(
      { fcmToken: fcmToken },
      { $set: { fcmToken: "" } }
    );

    console.log(`✅ FCM token saved/refreshed for admin ${adminId} (${admin.fcmTokens.length} active devices)`);

    res.json({ success: true, message: "Admin token saved successfully", activeDevices: admin.fcmTokens.length });
  } catch (error) {
    console.error("Error saving admin FCM token:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//  Save Token Controller for Employees
export const saveEmployeeToken = async (req, res) => {
  try {
    const { employeeId, fcmToken, oldToken, deviceId, deviceInfo } = req.body;

    if (!employeeId || !fcmToken) {
      return res.status(400).json({ success: false, message: "Missing employeeId or fcmToken" });
    }

    const employee = await Employee.findById(employeeId);
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    // Initialize fcmTokens if empty but legacy fcmToken exists
    if ((!employee.fcmTokens || employee.fcmTokens.length === 0) && employee.fcmToken) {
      employee.fcmTokens = [{
        token: employee.fcmToken,
        deviceId: "",
        deviceInfo: "",
        lastLogin: employee.lastLogin || employee.updatedAt || new Date(),
        updatedAt: new Date()
      }];
    }
    if (!employee.fcmTokens) employee.fcmTokens = [];

    // Matching hierarchy for token refresh:
    // 1. Match by deviceId
    // 2. Match by oldToken
    // 3. Match by token === fcmToken
    let matchedEntry = null;
    if (deviceId) {
      matchedEntry = employee.fcmTokens.find(e => e.deviceId && e.deviceId === deviceId);
    }
    if (!matchedEntry && oldToken) {
      matchedEntry = employee.fcmTokens.find(e => e.token === oldToken);
    }
    if (!matchedEntry) {
      matchedEntry = employee.fcmTokens.find(e => e.token === fcmToken);
    }

    if (matchedEntry) {
      // Token refresh on known device: keep lastLogin intact!
      matchedEntry.token = fcmToken;
      matchedEntry.updatedAt = new Date();
      if (deviceId) matchedEntry.deviceId = deviceId;
      if (deviceInfo) matchedEntry.deviceInfo = deviceInfo;
    } else {
      // New device or unregistered token
      if (employee.fcmTokens.length < 2) {
        employee.fcmTokens.push({
          token: fcmToken,
          deviceId: deviceId || "",
          deviceInfo: deviceInfo || req.headers["user-agent"] || "",
          lastLogin: new Date(),
          updatedAt: new Date()
        });
      } else {
        employee.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
        employee.fcmTokens[1].token = fcmToken;
        employee.fcmTokens[1].updatedAt = new Date();
        if (deviceId) employee.fcmTokens[1].deviceId = deviceId;
        if (deviceInfo) employee.fcmTokens[1].deviceInfo = deviceInfo;
      }
    }

    // Sort by lastLogin descending
    employee.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
    employee.fcmTokens = employee.fcmTokens.slice(0, 2);

    // Synchronize primary fcmToken
    employee.fcmToken = employee.fcmTokens[0].token;

    await employee.save();

    // Clear stale token from other employees without wiping their whole array
    await Employee.updateMany(
      { _id: { $ne: employeeId }, "fcmTokens.token": fcmToken },
      { $pull: { fcmTokens: { token: fcmToken } } }
    );
    await Employee.updateMany(
      { _id: { $ne: employeeId }, fcmToken: fcmToken },
      { $set: { fcmToken: "" } }
    );

    console.log(`✅ FCM token saved/refreshed for employee ${employeeId} (${employee.fcmTokens.length} active devices)`);

    res.json({ success: true, message: "Employee token saved successfully", activeDevices: employee.fcmTokens.length });
  } catch (error) {
    console.error("Error saving employee FCM token:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
