import jwt from "jsonwebtoken";
import Admin from "../models/adminAuthSchema.js";
import Employee from "../models/employeeSchema.js";

export const verifyAdminToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1]; // Bearer TOKEN

    if (!token) return res.status(401).json({ message: "No token, authorization denied" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // First, check if it's a Super Admin
    let user = await Admin.findById(decoded.id);

    // If not found in Admin, check if it's an Employee with admin access
    if (!user) {
      user = await Employee.findById(decoded.id);

      if (!user || !user.giveAdminAccess) {
        return res.status(401).json({ message: "Invalid token or insufficient permissions" });
      }
      // Tag that this is an admin-level access from an employee
      req.isAdminEmployee = true;
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Token Verification Error:", error);
    res.status(401).json({ message: "Token is not valid", error: error.message });
  }
};
