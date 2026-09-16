import bcrypt from "bcryptjs";
import User from "../models/user.js";
import Admin from "../models/adminAuthSchema.js";

// ========================
// Change Password Controller of user
// ========================
export const changePassword = async (req, res) => {
  try {
    const  userId  = req.user.id;
     // you can also pass email instead
    const { currentPassword, newPassword, confirmNewPassword } = req.body;

    // 1 Check all fields
    if (!userId || !currentPassword || !newPassword || !confirmNewPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 2 Check new password and confirm match
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ message: "New passwords do not match" });
    }

    // 3 Find user by ID
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 4 Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // 5 Hash new password and save
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.status(200).json({ message: "Password changed successfully" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};





