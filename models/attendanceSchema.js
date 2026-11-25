import mongoose from "mongoose";

const attendanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
      index: true, // YYYY-MM-DD format (e.g. "2026-11-24")
    },
    year: {
      type: Number,
      required: true,
      index: true, // e.g. 2026
    },
    month: {
      type: Number,
      required: true,
      index: true, // 1 - 12
    },
    day: {
      type: Number,
      required: true, // 1 - 31
    },
    checkIn: {
      time: { type: Date, default: null },
      timeStr: { type: String, default: "" }, // e.g. "09:35 AM"
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      deviceInfo: { type: String, default: "" },
    },
    checkOut: {
      time: { type: Date, default: null },
      timeStr: { type: String, default: "" }, // e.g. "06:32 PM"
      location: {
        latitude: Number,
        longitude: Number,
        address: String,
      },
      deviceInfo: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["Present", "Late", "Half Day", "Absent", "Holiday", "Week Off", "On Leave"],
      default: "Present",
      index: true,
    },
    shiftName: {
      type: String,
      default: "General Day Shift",
    },
    shiftStartTime: {
      type: String,
      default: "09:30",
    },
    shiftEndTime: {
      type: String,
      default: "18:30",
    },
    lateMinutes: {
      type: Number,
      default: 0,
    },
    earlyExitMinutes: {
      type: Number,
      default: 0,
    },
    totalWorkingHours: {
      type: Number,
      default: 0, // e.g. 8.5
    },
    isRegularized: {
      type: Boolean,
      default: false,
    },
    regularizeReason: {
      type: String,
      default: "",
    },
    regularizedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    notes: {
      type: String,
      default: "",
    },
    lateReason: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Compound index to ensure 1 attendance record per employee per day
attendanceSchema.index({ employeeId: 1, dateStr: 1 }, { unique: true });
// Compound index for fast monthly matrix queries
attendanceSchema.index({ year: 1, month: 1, employeeId: 1 });

export default mongoose.models.Attendance || mongoose.model("Attendance", attendanceSchema);
