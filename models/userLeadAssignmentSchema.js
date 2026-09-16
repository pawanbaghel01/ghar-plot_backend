import mongoose from "mongoose";

const userLeadAssignmentSchema = new mongoose.Schema({
  // Employee who is assigned the user lead
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Employee",
    required: true,
    index: true
  },
  
  // User/Client being assigned
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true
  },
  
  // Admin who assigned the lead
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  
  // Assignment status
  status: {
    type: String,
    enum: ["active", "completed", "cancelled", "on-hold"],
    default: "active",
    index: true
  },
  
  // Priority level
  priority: {
    type: String,
    enum: ["low", "medium", "high", "urgent"],
    default: "medium",
    index: true
  },
  
  // Assignment date
  assignedDate: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  // Due date (optional)
  dueDate: {
    type: Date,
    index: true
  },
  
  // Notes from admin
  notes: {
    type: String,
    maxlength: 1000
  },
  
  // Follow-up history
  followUps: [{
    date: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: 500
    },
    addedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee"
    }
  }],
  
  // Last activity date
  lastActivity: {
    type: Date,
    default: Date.now
  },
  
  // Completion date (when marked as completed)
  completedDate: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes for better performance
userLeadAssignmentSchema.index({ employeeId: 1, status: 1 });
userLeadAssignmentSchema.index({ assignedDate: -1 });
userLeadAssignmentSchema.index({ userId: 1, employeeId: 1 });
userLeadAssignmentSchema.index({ priority: 1, status: 1 });

// Ensure unique assignment per user-employee combination for active status
userLeadAssignmentSchema.index(
  { userId: 1, employeeId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: "active" }
  }
);

// Update lastActivity on any change
userLeadAssignmentSchema.pre('save', function(next) {
  this.lastActivity = new Date();
  next();
});

const UserLeadAssignment = mongoose.model("UserLeadAssignment", userLeadAssignmentSchema);

export default UserLeadAssignment;