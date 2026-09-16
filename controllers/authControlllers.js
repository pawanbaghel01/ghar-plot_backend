import User from "../models/user.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import dotenv from "dotenv";
import axios from "axios";




dotenv.config();




let otpStore = {}; // temporary in-memory OTP store

// ====================== SEND OTP ======================
export const sendPhoneOtp = async (req, res) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res
        .status(400)
        .json({ success: false, message: "Phone number is required" });
    }

    // 🔹 Check if phone exists in DB
    const existingUser = await User.findOne({ phone });
    if (!existingUser) {
      return res
        .status(404)
        .json({ success: false, message: "Phone number not registered" });
    }

    // 🔹 Generate 4-digit OTP
    // const otp = Math.floor(1000 + Math.random() * 9000);
const otp = 1234;
    // 🔹 Store OTP temporarily
    otpStore[phone] = otp;

    // 🔹 Construct Renflair API URL
    const url = `${process.env.RENFLAIR_SMS_URL}?API=${process.env.RENFLAIR_API_KEY}&PHONE=${phone}&OTP=${otp}`;

    // 🔹 Send OTP via Renflair SMS API
    const response = await axios.get(url);
    console.log("Renflair API Response:", response.data);

    // 🔹 Save OTP + expiry in user DB (use updateOne to skip full validation)
    await User.updateOne(
      { _id: existingUser._id },
      { resetOtp: otp, otpExpiry: new Date(Date.now() + 5 * 60 * 1000) }
    );

    return res.status(200).json({
      success: true,
      message: `OTP sent successfully to ${phone}`,
      otp, // ⚠️ only for testing — remove in production
    });
  } catch (error) {
    console.error("Send OTP Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Failed to send OTP" });
  }
};

// ====================== VERIFY OTP + GENERATE TOKEN ======================
export const verifyPhoneOtp = async (req, res) => {
  try {
    const { phone, otp } = req.body;

    // Validation
    if (!phone || !otp) {
      return res
        .status(400)
        .json({ success: false, message: "Phone and OTP are required" });
    }

    // 🔹 Check if user exists
    const user = await User.findOne({ phone });
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Phone number not found" });
    }

    // 🔹 Verify OTP — check both in-memory store and DB (handles server restarts)
    const storedOtp = otpStore[phone] || user.resetOtp;
    const isOtpValid =
      storedOtp &&
      storedOtp == otp &&
      user.otpExpiry &&
      new Date(user.otpExpiry) > new Date();

    if (!isOtpValid) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid or expired OTP" });
    }

    //  OTP verified → remove it from memory + DB
    delete otpStore[phone];
    await User.updateOne(
      { _id: user._id },
      { isPhoneVerified: true, isOtpVerified: true, resetOtp: null }
    );

    //  Generate JWT Token
    // const token = jwt.sign(
    //   { id: user._id, phone: user.phone },
    //   process.env.JWT_SECRET,
    //   { expiresIn: "7d" }
    // );
    const token = jwt.sign(
  {
    id: user._id,          // ✅ MUST
    phone: user.phone,
    email: user.email,
    fullName: user.fullName,
    role: "user"
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    //  Return success response
    return res.status(200).json({
      success: true,
      message: "OTP verified successfully",
      token,
      user: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
      },
    });
  } catch (error) {
    console.error("Verify OTP Error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Error verifying OTP" });
  }
};

//  Step 5: Final Signup
export const signup = async (req, res) => {
  try {
    const { fullName, email, phone, state, city, street, pinCode, password, dob } =
      req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "User already exists", success: false });

    // Password is optional — users login via phone OTP
    // If no password provided, generate a random secure string
    const rawPassword = password || Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10);
    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const newUser = new User({
      fullName,
      email,
      phone,
      state,
      city,
      street,
      pinCode,
      password: hashedPassword,
      isEmailVerified: true,
      isPhoneVerified: true,
    });

    const savedUser = await newUser.save();
    console.log("Saved user:", savedUser);

    // Generate JWT token so frontend can auto-login after registration
    const token = jwt.sign(
      {
        id: savedUser._id,
        email: savedUser.email,
        fullName: savedUser.fullName,
        phone: savedUser.phone,
        role: "user"
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.status(201).json({
      success: true,
      message: "Registration completed successfully",
      token,
      user: {
        id: savedUser._id,
        fullName: savedUser.fullName,
        email: savedUser.email,
        phone: savedUser.phone,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// LOGIN CONTROLLER
export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    // 1 Check if email and password provided
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // 2 Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 3 Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // 4 Update last login date
    user.lastLogin = new Date();
    await user.save();

    // 5 Generate JWT token
    // const token = jwt.sign(
    //   { id: user._id, email: user.email },
    //   process.env.JWT_SECRET || "mysecretkey",
    //   { expiresIn: "24h" }
    // );
    const token = jwt.sign(
  {
    id: user._id,          // ✅ MUST
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: "user"
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    // 6 Send response
    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        date: user.createdAt, // user registration date
        lastLogin: user.lastLogin, // recently added
      },
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// google auth
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const googleLogin = async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: "Token missing" });
    }

    //  Verify token with Google
    const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    const { sub, email, name, picture } = payload;

    //  Check if user already exists
    let user = await User.findOne({ email });

    if (!user) {
      // Create new user
      user = await User.create({
        name,
        email,
        googleId: sub,
      });
    }

    // Generate JWT token
    // const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
    //   expiresIn: "7d",
    // });
    
    const token = jwt.sign(
  {
    id: user._id,          // ✅ MUST
    email: user.email,
    fullName: user.name,
    role: "user"
  },
  process.env.JWT_SECRET,
  { expiresIn: "7d" }
);


    res.status(200).json({
      success: true,
      message: "Google login successful",
      user: {
        name: user.name,
        email: user.email,
      },
      token,
    });
  } catch (error) {
    console.error("Google Login Error:", error);
    res.status(401).json({
      success: false,
      message: "Invalid Google token",
      error: error.message,
    });
  }
};


