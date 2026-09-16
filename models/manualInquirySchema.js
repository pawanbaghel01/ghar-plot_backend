import mongoose from "mongoose";

const manualInquirySchema = new mongoose.Schema(
  {
     s_No: {
      type: Number,
      required: true,
    },

    clientName: {
      type: String,
      required: true,
      trim: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    ClientCode: {
      type: String,
      required: true,
      trim: true,
    },
    ProjectCode: {
      type: String,
      required: true,
      trim: true,
    },

    productType: {
      type: String,
      required: true,
      trim: true,
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    caseStatus: {
      type: String,
      enum: ["Open", "Closed", "Week One", "Week Two", "Unassigned"],
      default: "Unassigned",
    },

    source: {
      type: String,
      trim: true,
    },

    majorComments: {
      type: String,
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    weekOrActionTaken: {
      type: String,
      trim: true,
    },

    actionPlan: {
      type: String,
      trim: true,
    },

    referenceBy: {
      type: String,
      trim: true,
    },

    comments: [
      {
        comment: {
          type: String,
          required: true,
        },
        addedBy: {
          type: String,
          default: "Admin",
        },
        addedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

export default mongoose.model("ManualInquiry", manualInquirySchema);
