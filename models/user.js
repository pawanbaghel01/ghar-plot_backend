import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    state: String,
    city: String,
    street: String,
    pinCode: String,
    password: { type: String, required: false },

    //  Avatar field (already present)
    avatar: {
      type: String,
      default: "https://abc.ridealmobility.com/uploads/default-avatar.jpg",
    },

    photosAndVideo: {
      type: [String],
      default: [],
    },

    lastLogin: { type: Date, default: null },

    isEmailVerified: { type: Boolean, default: false },
    isPhoneVerified: { type: Boolean, default: false },

    resetOtp: { type: Number },
    otpExpiry: { type: Date },
    isOtpVerified: { type: Boolean, default: false },
    //  Device FCM Token for push notifications
    fcmToken: { type: String, default: "" },

    //  Google Auth fields (newly added)
    googleId: { type: String, default: null },
    loginProvider: {
      type: String,
      enum: ["manual", "google"],
      default: "manual",
    },

    // Unique Client Code (e.g. CL01, CL02...)
    clientCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },

    // Track number of listings posted by this user
    myListingsCount: {
      type: Number,
      default: 0,
    },

    // Admin Control: Whether this client can receive property purchase queries/notifications
    canReceiveInquiries: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

//  Pre-save hook for avatar
userSchema.pre("save", function (next) {
  if (
    this.avatar &&
    this.avatar !== "https://abc.ridealmobility.com/uploads/default-avatar.jpg"
  ) {
    return next();
  }

  if (this.photosAndVideo.length > 0) {
    this.avatar = this.photosAndVideo[0];
  } else {
    this.avatar = "https://abc.ridealmobility.com/uploads/default-avatar.jpg";
  }

  next();
});

export default mongoose.model("User", userSchema);
