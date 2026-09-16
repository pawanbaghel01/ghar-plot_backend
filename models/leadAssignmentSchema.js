import mongoose from "mongoose";

const leadAssignmentSchema = new mongoose.Schema({
  enquiryId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'enquiryType'
  },
  enquiryType: {
    type: String,
    required: true,
    enum: ['Inquiry', 'ManualInquiry'] // Reference to either regular inquiry or manual inquiry
  },
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  assignedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Admin who assigned the lead
    required: true
  },
  assignedDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: {
    type: String,
    default: ''
  },
  dueDate: {
    type: Date
  },
  followUpHistory: [{
    date: {
      type: Date,
      default: Date.now
    },
    action: String,
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee'
    }
  }]
}, {
  timestamps: true
});

// Indexes for better query performance
leadAssignmentSchema.index({ employeeId: 1, status: 1 });
leadAssignmentSchema.index({ enquiryId: 1, enquiryType: 1 });
leadAssignmentSchema.index({ assignedDate: -1 });

export default mongoose.model("LeadAssignment", leadAssignmentSchema);