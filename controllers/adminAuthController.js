import Admin from "../models/adminAuthSchema.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import Session from "../models/sessionSchema.js";
import Alert from "../models/alertSchema.js";

dotenv.config();


//   Signup
export const registerAdmin = async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password, fcmToken } = req.body;

    if (!fullName || !email || !mobileNumber || !password)
      return res.status(400).json({ message: "All fields are required" });

    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin)
      return res.status(400).json({ message: "Email already registered" });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newAdmin = new Admin({
      fullName,
      email,
      mobileNumber,
      password: hashedPassword,
      fcmToken: fcmToken || "",
    });
    await newAdmin.save();

    // JWT
    // const token = jwt.sign({ id: newAdmin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "Admin registered successfully",
      admin: {
        id: newAdmin._id,
        fullName: newAdmin.fullName,
        email: newAdmin.email,
        mobileNumber: newAdmin.mobileNumber,
        fcmToken: newAdmin.fcmToken,
      },
    });
  } catch (error) {
    console.error("Admin Signup Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

//   Login
export const loginAdmin = async (req, res) => {
  try {
    const { email, password, fcmToken, deviceId, deviceInfo } = req.body;

    if (!email || !password)
      return res.status(400).json({ message: "Email and password are required" });

    const admin = await Admin.findOne({ email });
    if (!admin)
      return res.status(400).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid email or password" });

    // Update FCM token & device session on login (Actual Login Event)
    if (fcmToken) {
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

      const currentDeviceId = deviceId || "";
      const currentDeviceInfo = deviceInfo || req.headers["user-agent"] || "";

      let existingIndex = -1;
      if (currentDeviceId) {
        existingIndex = admin.fcmTokens.findIndex(e => e.deviceId && e.deviceId === currentDeviceId);
      }
      if (existingIndex === -1) {
        existingIndex = admin.fcmTokens.findIndex(e => e.token === fcmToken);
      }

      if (existingIndex !== -1) {
        admin.fcmTokens[existingIndex].token = fcmToken;
        admin.fcmTokens[existingIndex].lastLogin = new Date();
        admin.fcmTokens[existingIndex].updatedAt = new Date();
        if (currentDeviceId) admin.fcmTokens[existingIndex].deviceId = currentDeviceId;
        if (currentDeviceInfo) admin.fcmTokens[existingIndex].deviceInfo = currentDeviceInfo;
      } else {
        admin.fcmTokens.push({
          token: fcmToken,
          deviceId: currentDeviceId,
          deviceInfo: currentDeviceInfo,
          lastLogin: new Date(),
          updatedAt: new Date()
        });
      }

      // Sort strictly by lastLogin descending to maintain latest 2 devices
      admin.fcmTokens.sort((a, b) => new Date(b.lastLogin || 0) - new Date(a.lastLogin || 0));
      admin.fcmTokens = admin.fcmTokens.slice(0, 2);

      // Primary fcmToken is always the latest active token
      admin.fcmToken = admin.fcmTokens[0].token;
      await admin.save();
      console.log(`✅ FCM token & multi-device session updated on login for admin ${admin._id} (${admin.fcmTokens.length} active devices)`);

      // Also update all alerts for this admin with the latest FCM token
      try {
        const updateResult = await Alert.updateMany(
          { userId: admin._id },
          { fcmToken: admin.fcmToken }
        );
        console.log(`✅ Updated ${updateResult.modifiedCount} alerts with new FCM token for admin ${admin._id}`);
      } catch (alertError) {
        console.error("Error updating alerts with FCM token:", alertError.message);
      }
    }

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, { expiresIn: "7d" });

    // --------------------------
    // Create Active Session
    // --------------------------
    const session = new Session({
      userId: admin._id,
      device: req.headers["user-agent"], // browser/device info
      ip: req.ip || req.connection.remoteAddress, 
      token: token,
    });
    await session.save();

    res.status(200).json({
      message: "Login successful",
      admin: {
        id: admin._id,
        fullName: admin.fullName,
        email: admin.email,
        mobileNumber: admin.mobileNumber,
        fcmToken: admin.fcmToken,
      },
      token,
      sessionId: session._id, // optional, for tracking specific session
    });
  } catch (error) {
    console.error("Admin Login Error:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// ========================
// Admin Change Password Controller (with JWT Auth)
// ========================
export const adminChangePassword = async (req, res) => {
  try {
    // const userId = req.query.userId;
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
    const user = await Admin.findById(userId);
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



// Gmail transporter
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

//  1. Send OTP for enabling 2FA
export const sendTwoFAOtp = async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    admin.twoFA.otp = otp;
    admin.twoFA.otpExpires = Date.now() + 5 * 60 * 1000; // 5 min
    await admin.save();

    // Send mail
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: admin.email,
      subject: "Enable 2FA OTP Code",
      text: `Your OTP to enable 2FA is: ${otp}`,
    });

    res.status(200).json({ message: "OTP sent to your email" });
  } catch (error) {
    res.status(500).json({ message: "Error sending OTP", error: error.message });
  }
};

//  2. Verify OTP and enable 2FA
export const verifyTwoFAOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    if (admin.twoFA.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    if (Date.now() > admin.twoFA.otpExpires)
      return res.status(400).json({ message: "OTP expired" });

    admin.twoFA.enabled = true;
    admin.twoFA.otp = null;
    admin.twoFA.otpExpires = null;
    await admin.save();

    res.status(200).json({ message: "2FA enabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error verifying OTP", error: error.message });
  }
};

// 3. Disable 2FA
export const disableTwoFA = async (req, res) => {
  try {
    const adminId = req.user.id; // use id from token
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.twoFA.enabled = false;
    await admin.save();

    res.status(200).json({ message: "2FA disabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error disabling 2FA", error: error.message });
  }
};

export const enableTwoFA = async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findById(adminId);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    admin.twoFA.enabled = true;
    await admin.save();

    res.status(200).json({ message: "2FA enabled successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error enabling 2FA", error: error.message });
  }
};

// get active session
export const getActiveSessions = async (req, res) => {
  const userId = req.user.id; // from auth middleware
  const sessions = await Session.find({ userId });
  res.json(sessions);
};

// logout session

export const logoutSession = async (req, res) => {
  const { sessionId } = req.params;
  await Session.findByIdAndDelete(sessionId);
  res.json({ message: "Logged out from this session" });
};



// -------------------- 1. SEND OTP --------------------
export const adminForgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // 1️⃣ Check admin exists
    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    // 2️⃣ Generate OTP and expiry
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + 5 * 60 * 1000; // 5 mins

    // 3️⃣ Save OTP and expiry in nested twoFA field
    admin.twoFA.otp = otp;
    admin.twoFA.otpExpires = otpExpiry;
    admin.twoFA.enabled = false; // reset 2FA flag before verification
    await admin.save();

    // 4️⃣ Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Admin Support" <${process.env.EMAIL_USER}>`,
      to: admin.email,
      subject: "Admin Password Reset OTP",
      html: `
        <h2>Hello ${admin.fullName},</h2>
        <p>Your OTP for resetting your admin password is:</p>
        <h1 style="color: #2e6c80;">${otp}</h1>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to admin email.",
    });
  } catch (error) {
    console.error("Admin Forget Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 2. VERIFY OTP --------------------
export const adminVerifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (admin.twoFA.otp !== otp.toString()) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    if (admin.twoFA.otpExpires < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    admin.twoFA.enabled = true; // mark verified
    await admin.save();

    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      adminId: admin._id,
    });
  } catch (error) {
    console.error("Admin Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 3. RESET PASSWORD --------------------
export const adminResetPassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(404).json({ success: false, message: "Admin not found" });
    }

    if (!admin.twoFA.enabled) {
      return res.status(400).json({ success: false, message: "OTP not verified" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedPassword;

    // Clear OTP info
    admin.twoFA = {
      enabled: false,
      otp: null,
      otpExpires: null,
    };

    await admin.save();

    return res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Admin Reset Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

  

