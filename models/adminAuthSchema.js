import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  mobileNumber: { type: String, required: true },
  password: { type: String, required: true },
  fcmToken: { type: String, default: "" }, // Primary / backward-compatible token
  fcmTokens: [
    {
      token: { type: String, required: true },
      deviceId: { type: String, default: "" },
      deviceInfo: { type: String, default: "" },
      lastLogin: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
  ],
  twoFA: {
    enabled: { type: Boolean, default: false },
    otp: { type: String },
    otpExpires: { type: Date },
  },
}, { timestamps: true });

const Admin = mongoose.model("Admin", adminSchema);
export default Admin;
