import mongoose from "mongoose";

const followUpSchema = new mongoose.Schema({
  // Lead Reference - Dynamic reference to support both user leads and enquiry leads
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    required: false, // Made optional for direct lead-based follow-ups
    refPath: 'leadType'
  },
  leadType: {
    type: String,
    required: true,
    enum: ['UserLeadAssignment', 'LeadAssignment', 'Lead', 'client', 'enquiry'] // Added more lead types
  },
  
  // Original Lead Data for Quick Access
  leadData: {
    // For User Leads
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    // For Enquiry Leads  
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'leadData.enquiryType'
    },
    enquiryType: {
      type: String,
      enum: ['Inquiry', 'ManualInquiry']
    },
    // Common fields
    clientName: String,
    clientPhone: String,
    clientEmail: String,
    propertyType: String,
    location: String
  },

  // Follow-up Details
  caseStatus: {
    type: String,
    enum: ['open', 'close', 'not-interested'],
    default: 'open',
    required: true
  },
  
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },

  // Agent/Employee Information
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee',
    required: true
  },
  
  // Management Tracking
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'createdByType',
    required: true
  },
  createdByType: {
    type: String,
    enum: ['Employee', 'User'], // Admin/Manager (Employee) or Agent (Employee)
    required: true
  },

  // Follow-up Actions and Comments
  comments: [{
    text: {
      type: String,
      required: true
    },
    commentBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: true
    },
    commentByName: String, // Cache for quick display
    commentDate: {
      type: Date,
      default: Date.now
    },
    actionTaken: {
      type: String,
      enum: ['call', 'email', 'meeting', 'site_visit', 'document_sent', 'follow_up_scheduled', 'other'],
      default: 'other'
    }
  }],

  // Scheduling
  nextFollowUpDate: {
    type: Date
  },
  lastContactDate: {
    type: Date,
    default: Date.now
  },

  // Status Tracking
  isActive: {
    type: Boolean,
    default: true
  },
  closedDate: Date,
  closedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employee'
  },
  closeReason: String,
  
  // Closing Result - Required when status is 'close'
  result: {
    type: String,
    trim: true
  },
  wordCount: {
    type: Number,
    default: 0
  },

  // Result Tracking
  outcome: {
    type: String,
    enum: ['converted', 'lost', 'on-hold', 'pending'],
    default: 'pending'
  },
  conversionDetails: {
    amount: Number,
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Property'
    },
    conversionDate: Date
  },

  // Metadata
  tags: [String],
  followUpSource: {
    type: String,
    enum: ['manual', 'auto-reminder', 'system'],
    default: 'manual'
  }
}, {
  timestamps: true
});

// Indexes for better performance
followUpSchema.index({ leadId: 1, leadType: 1 });
followUpSchema.index({ assignedAgent: 1, caseStatus: 1 });
followUpSchema.index({ caseStatus: 1, isActive: 1 });
followUpSchema.index({ nextFollowUpDate: 1 });
followUpSchema.index({ createdAt: -1 });

// Virtual for getting lead details
followUpSchema.virtual('leadDetails', {
  refPath: 'leadType',
  localField: 'leadId',
  foreignField: '_id'
});

// Ensure virtuals are included in JSON
followUpSchema.set('toJSON', { virtuals: true });
followUpSchema.set('toObject', { virtuals: true });

export default mongoose.model("FollowUp", followUpSchema);