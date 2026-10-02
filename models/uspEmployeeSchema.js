import mongoose from "mongoose";

const uspEmployeeSchema = new mongoose.Schema(
  {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "USPCategory",
      required: true,
    },
    // For employees from the system
    employee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    // For manually added employees
    manualName: {
      type: String,
      trim: true,
      default: null,
    },
    manualPhone: {
      type: String,
      trim: true,
      default: null,
    },
    // Employee type: 'system' or 'manual'
    employeeType: {
      type: String,
      enum: ["system", "manual"],
      required: true,
    },
    expertise: {
      type: String,
      trim: true,
      default: "",
    },
    experienceYears: {
      type: Number,
      default: 0,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    descriptionHistory: [
      {
        text: {
          type: String,
          trim: true,
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
        addedBy: {
          type: String,
          default: "Admin",
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    // Ownership: which Admin or Employee created this USP entry
    createdByAdmin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    createdByEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    // Target Employee who should receive this reminder
    assignedEmployee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    // Reminder & Scheduling
    reminderTitle: {
      type: String,
      trim: true,
      default: "",
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    scheduledTime: {
      type: String,
      default: "",
    },
    scheduledDateTime: {
      type: Date,
      default: null,
    },
    scheduleType: {
      type: String,
      enum: ["one_time", "recurring", "follow_up"],
      default: "one_time",
    },
    repeatType: {
      type: String,
      default: "none", // none, daily, weekly, monthly, custom
    },
    customDurationMinutes: {
      type: Number,
      default: 0,
    },
    isReminderActive: {
      type: Boolean,
      default: false,
    },
    cronFired: {
      type: Boolean,
      default: false,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
uspEmployeeSchema.index({ category: 1 });
uspEmployeeSchema.index({ employee: 1 });

const USPEmployee = mongoose.model("USPEmployee", uspEmployeeSchema);

export default USPEmployee;
