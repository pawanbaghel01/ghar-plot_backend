// import mongoose from "mongoose";


// const alertSchema = new mongoose.Schema(
//   {
//     userId: {
//       type: mongoose.Schema.Types.ObjectId,
//       ref: "User",
//       required: true,
//     },
//     title: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     date: {
//       type: Date,
//       required: true,
//     },
//     time: {
//       type: String,
//       required: true,
//     },
//     reason: {
//       type: String,
//       required: true,
//       trim: true,
//     },
//     category: {
//       type: String,
//       enum: ["alert", "reminder"],
//       default: "alert",
//     },
//     repeatFrequency: {
//       type: String,
//       default: "none",
//     },
//     repeatMetadata: {
//       type: mongoose.Schema.Types.Mixed,
//       default: null,
//     },
//     repeatDaily: {
//       type: Boolean,
//       default: false,
//     },
//     isActive: {
//       type: Boolean,
//       default: true,
//     },
//     lastTriggered: {
//       type: Date,
//       default: null,
//     },
//   },
//   { timestamps: true }
// );


// // Index for efficient queries
// alertSchema.index({ userId: 1, date: 1 });
// alertSchema.index({ isActive: 1, repeatDaily: 1 });

// const Alert = mongoose.model("Alert", alertSchema);

// export default Alert;


import mongoose from "mongoose";



const alertSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    scheduledDateTime: {
      type: Date,
      default: null,
    },
    fcmToken: {
      type: String,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["alert", "reminder"],
      default: "alert",
    },
    repeatFrequency: {
      type: String,
      default: "none",
    },
    repeatMetadata: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    repeatDaily: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    placeReminder: {
      type: Boolean,
      default: true,
    },
    lastTriggered: {
      type: Date,
      default: null,
    },
    assignedEmployeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    enquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    clientName: {
      type: String,
      default: "",
    },
    phone: {
      type: String,
      default: "",
    },
    // Threaded comment / message history
    commentHistory: [
      {
        text: { type: String, trim: true },
        authorName: { type: String, default: "" },
        authorRole: { type: String, default: "employee" },
        authorId: { type: mongoose.Schema.Types.ObjectId },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    // Edit history to track changes
    editHistory: [{
      changesSummary: { type: String, default: "" },
      details: [{ type: String }],
      editedAt: { type: Date, default: Date.now },
      editorName: { type: String, default: "" },
      editorRole: { type: String, default: "employee" },
      editedBy: { type: mongoose.Schema.Types.ObjectId }
    }],
    lastEditedByName: { type: String, default: "" },
    lastEditedByRole: { type: String, default: "" },
    lastEditedAt: { type: Date },
    lastEditSummary: { type: String, default: "" },
  },
  { timestamps: true }
);


// Index for efficient queries
alertSchema.index({ userId: 1, date: 1 });
alertSchema.index({ isActive: 1, repeatDaily: 1 });

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
