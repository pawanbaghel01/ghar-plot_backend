import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import SavedProperty from "../models/saveProperty.js";
import Property from "../models/addProps.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import admin from "../config/firebase.js";
import UserLeadAssignment from "../models/userLeadAssignmentSchema.js";

dotenv.config();


// ==========================
// Get all users
// ==========================
// export const getAllUsers = async (req, res) => {
//   try {
//     const users = await User.find().select("-password"); // exclude password
//     const count = await User.countDocuments();
//     if (users.length === 0) {
//       return res.status(404).json({ success: false, message: "No users found" });
//     }
//     res.status(200).json({ success: true,  totalUsers: count ,users });
//   } catch (err) {
//     res.status(500).json({ success: false, error: err.message });
//   }
// };

export const getAllUsers = async (req, res) => {
  try {
    // Get pagination parameters from query
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const count = await User.countDocuments();

    // Get paginated users excluding passwords
    const users = await User.find()
      .select("-password")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    if (users.length === 0 && page === 1) {
      return res.status(404).json({ success: false, message: "No users found" });
    }

    // Get assignment data for the current page of users
    const userIds = users.map(user => user._id);
    const assignments = await UserLeadAssignment.find({
      userId: { $in: userIds },
      status: 'active'
    })
      .populate('employeeId', 'name email')
      .lean();

    console.log(`Page ${page} users:`, users.length);
    console.log('Active assignments found:', assignments.length);

    // Create a map of userId to assignment
    const assignmentMap = {};
    assignments.forEach(assignment => {
      assignmentMap[assignment.userId.toString()] = assignment;
    });

    // Attach assignment data to each user
    const usersWithAssignments = users.map(user => {
      const userObj = user.toObject();
      const assignment = assignmentMap[user._id.toString()];

      if (assignment) {
        userObj.assignment = {
          _id: assignment._id,
          employeeId: assignment.employeeId,
          priority: assignment.priority,
          assignedDate: assignment.assignedDate,
          notes: assignment.notes,
          status: assignment.status
        };
      } else {
        userObj.assignment = null;
      }

      return userObj;
    });

    // ✅ Return response with pagination info
    res.status(200).json({
      success: true,
      totalUsers: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      users: usersWithAssignments,
    });

  } catch (err) {
    console.error("Error in getAllUsers:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==========================
// Search users
// ==========================
export const searchUsers = async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) {
      return res.status(400).json({ success: false, message: "Search query is required" });
    }

    const searchQuery = {
      $or: [
        { name: { $regex: q, $options: "i" } },
        { fullName: { $regex: q, $options: "i" } },
        { email: { $regex: q, $options: "i" } },
        { phone: { $regex: q, $options: "i" } },
        { phoneNumber: { $regex: q, $options: "i" } },
      ],
    };

    const users = await User.find(searchQuery).select("-password").limit(20);
    const count = await User.countDocuments(searchQuery);

    res.status(200).json({
      success: true,
      totalFound: count,
      users,
    });
  } catch (err) {
    console.error("Error in searchUsers:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==========================
// Get logged-in user by Token
// ==========================


export const getUserByToken = async (req, res) => {
  try {
    const userId = req.user.id; // from verifyToken middleware

    // 1 Fetch user details
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // 2 Count shortlisted (saved) properties by this user
    const shortlistedCount = await SavedProperty.countDocuments({ userId });

    // 3 Count properties added by this user
    const myListingsCount = await Property.countDocuments({ userId });

    // 4 Count number of properties this user has visited (appears in visitedBy)
    const enquiriesCount = await Property.countDocuments({
      "visitedBy.userId": userId,
    });

    // 5 Attach counts dynamically
    const userWithCounts = {
      ...user.toObject(),
      shortlistedCount,
      myListingsCount,
      enquiriesCount,
    };

    res.status(200).json({
      success: true,
      user: userWithCounts,
    });
  } catch (err) {
    console.error("Get User Error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==========================
// Update user
// ==========================
export const updateUser = async (req, res) => {
  try {
    const updates = req.body;

    // If password update
    if (updates.password) {
      updates.password = await bcrypt.hash(updates.password, 10);
    }

    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true }).select("-password");
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User updated", user });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// ==========================
// Delete user
// ==========================
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });

    res.status(200).json({ success: true, message: "User deleted successfully" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};






// import User from "../models/user.js";
// import bcrypt from "bcryptjs";
// import nodemailer from "nodemailer";

// -------------------- 1. SEND FORGET PASSWORD OTP --------------------
export const forgetPassword = async (req, res) => {
  try {
    const { email } = req.body;

    //  Check user exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    //  Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000);

    //  Set OTP expiry (5 minutes)
    const otpExpiry = Date.now() + 5 * 60 * 1000;

    //  Save OTP and expiry in DB
    user.resetOtp = otp;
    user.otpExpiry = otpExpiry;
    user.isOtpVerified = false;
    await user.save();

    //  Send OTP via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"Support" <${process.env.EMAIL_USER}>`,
      to: user.email,
      subject: "Password Reset OTP",
      html: `
        <h2>Hello ${user.fullName || "User"},</h2>
        <p>Your OTP for resetting the password is:</p>
        <h1 style="color: #2e6c80;">${otp}</h1>
        <p>This OTP will expire in <b>5 minutes</b>.</p>
      `,
    };

    await transporter.sendMail(mailOptions);

    return res.status(200).json({
      success: true,
      message: "OTP sent successfully to your email.",
    });
  } catch (error) {
    console.error("Forget Password (Send OTP) Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 2. VERIFY OTP --------------------
export const verifyResetToken = async (req, res) => {
  try {
    const { email, otp } = req.body;

    //  Check user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    //  Wrong OTP
    if (user.resetOtp !== Number(otp)) {
      return res.status(400).json({ success: false, message: "Invalid OTP" });
    }

    //  OTP expired
    if (user.otpExpiry < Date.now()) {
      return res.status(400).json({ success: false, message: "OTP expired" });
    }

    //  OTP verified
    user.isOtpVerified = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      userId: user._id,
    });
  } catch (error) {
    console.error("Verify OTP Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// -------------------- 3. UPDATE PASSWORD --------------------
export const updatePassword = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    //  Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    //  Check if OTP verified
    if (!user.isOtpVerified) {
      return res.status(400).json({ success: false, message: "OTP not verified" });
    }

    //  Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;

    //  Clear OTP data
    user.resetOtp = undefined;
    user.otpExpiry = undefined;
    user.isOtpVerified = false;

    await user.save();

    res.status(200).json({ success: true, message: "Password updated successfully" });
  } catch (error) {
    console.error("Update Password Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};





// // -------------------- 1. SEND FORGET PASSWORD LINK --------------------
// export const forgetPassword = async (req, res) => {
//   try {
//     const { email } = req.body;

//     // Check if user exists
//     const user = await User.findOne({ email });
//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // Generate token valid for 15 minutes
//     const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
//       expiresIn: "15m",
//     });

//     // Create reset link
//     const resetLink = `http://localhost:4000/reset-password/${token}`;

//     // Send Email
//     const transporter = nodemailer.createTransport({
//       service: "gmail",
//       auth: {
//         user: process.env.EMAIL_USER,
//         pass: process.env.EMAIL_PASS,
//       },
//     });

//     const mailOptions = {
//       from: `"Support" <${process.env.EMAIL_USER}>`,
//       to: user.email,
//       subject: "Password Reset Request",
//       html: `
//         <h2>Hello ${user.fullName},</h2>
//         <p>You requested to reset your password. Click the link below to set a new password:</p>
//         <a href="${resetLink}" target="_blank">${resetLink}</a>
//         <p>This link will expire in 15 minutes.</p>
//       `,
//     };

//     await transporter.sendMail(mailOptions);

//     return res.status(200).json({
//       success: true,
//       message: "Password reset link sent to your email.",
//       resetLink,
//     });
//   } catch (error) {
//     console.error("Forget Password Error:", error);
//     res.status(500).json({ success: false, message: "Server error" });
//   }
// };

// // -------------------- 2. VERIFY TOKEN --------------------
// export const verifyResetToken = async (req, res) => {
//   try {
//     const { token } = req.params;

//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     if (!decoded) {
//       return res.status(400).json({ success: false, message: "Invalid token" });
//     }

//     res.status(200).json({
//       success: true,
//       message: "Token verified successfully",
//       userId: decoded.id,
//     });
//   } catch (error) {
//     res.status(400).json({ success: false, message: "Token expired or invalid" });
//   }
// };

// // -------------------- 3. UPDATE PASSWORD --------------------
// export const updatePassword = async (req, res) => {
//   try {
//     const { token, newPassword } = req.body;

//     // Verify token
//     const decoded = jwt.verify(token, process.env.JWT_SECRET);
//     const user = await User.findById(decoded.id);

//     if (!user) {
//       return res.status(404).json({ success: false, message: "User not found" });
//     }

//     // Hash new password
//     const hashedPassword = await bcrypt.hash(newPassword, 10);
//     user.password = hashedPassword;

//     await user.save();

//     res.status(200).json({ success: true, message: "Password updated successfully" });
//   } catch (error) {
//     res.status(400).json({ success: false, message: "Invalid or expired token" });
//   }
// };
