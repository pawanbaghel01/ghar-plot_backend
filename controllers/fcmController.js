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
    const { adminId, fcmToken } = req.body;

    if (!adminId || !fcmToken) {
      return res.status(400).json({ success: false, message: "Missing adminId or fcmToken" });
    }

    // Clear stale token from employees before assigning to admin
    await Employee.updateMany({ fcmToken }, { $set: { fcmToken: '' } });
    await Admin.findByIdAndUpdate(adminId, { fcmToken });

    console.log(`✅ FCM token saved for admin ${adminId} (stale tokens cleared)`);

    res.json({ success: true, message: "Admin token saved successfully" });
  } catch (error) {
    console.error("Error saving admin FCM token:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

//  Save Token Controller for Employees
export const saveEmployeeToken = async (req, res) => {
  try {
    const { employeeId, fcmToken } = req.body;

    if (!employeeId || !fcmToken) {
      return res.status(400).json({ success: false, message: "Missing employeeId or fcmToken" });
    }

    // Only clear stale token from OTHER employees (NOT from Admin model)
    // Admin tokens must not be cleared here — they are managed separately via save-admin-token
    await Employee.updateMany({ _id: { $ne: employeeId }, fcmToken }, { $set: { fcmToken: '' } });
    await Employee.findByIdAndUpdate(employeeId, { fcmToken });

    console.log(`✅ FCM token saved for employee ${employeeId} (stale employee tokens cleared)`);

    res.json({ success: true, message: "Employee token saved successfully" });
  } catch (error) {
    console.error("Error saving employee FCM token:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
