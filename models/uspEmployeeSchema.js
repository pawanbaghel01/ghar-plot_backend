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
    isActive: {
      type: Boolean,
      default: true,
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
