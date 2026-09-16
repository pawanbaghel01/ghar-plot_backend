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
    lastTriggered: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);


// Index for efficient queries
alertSchema.index({ userId: 1, date: 1 });
alertSchema.index({ isActive: 1, repeatDaily: 1 });

const Alert = mongoose.model("Alert", alertSchema);

export default Alert;
