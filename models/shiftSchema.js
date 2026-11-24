import mongoose from "mongoose";

const shiftSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      default: "General Day Shift",
    },
    startTime: {
      type: String,
      required: true,
      default: "09:30", // HH:mm (24-hour format)
    },
    endTime: {
      type: String,
      required: true,
      default: "18:30", // HH:mm
    },
    gracePeriodMinutes: {
      type: Number,
      default: 15, // 15 mins grace period
      min: 0,
    },
    halfDayThresholdHours: {
      type: Number,
      default: 4.5, // Less than 4.5 hrs is Half Day
      min: 1,
    },
    fullDayHours: {
      type: Number,
      default: 8.0,
      min: 1,
    },
    workDays: {
      type: [String],
      default: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.models.Shift || mongoose.model("Shift", shiftSchema);
