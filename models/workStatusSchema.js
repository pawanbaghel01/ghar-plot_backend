import mongoose from "mongoose";

const workStatusSchema = new mongoose.Schema(
  {
    sNo: {
      type: Number,
      index: true,
    },
    projectName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: "",
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      default: null,
      index: true,
    },
    date: {
      type: Date,
      required: true,
      index: true,
    },
    dateStr: {
      type: String,
      required: true,
      trim: true,
      index: true, // e.g. "22-09-2026" (DD-MM-YYYY)
    },
    today: {
      type: String,
      default: "",
      trim: true,
    },
    tomorrow: {
      type: String,
      default: "",
      trim: true,
    },
    dayAfterTomorrow: {
      type: String,
      default: "",
      trim: true,
    },
    createdBy: {
      type: String,
      default: "Admin",
      trim: true,
    },
    createdByUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    businessAssociate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },
    notes: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { timestamps: true }
);

// Compound unique index on projectName and dateStr for synchronization without duplicates
workStatusSchema.index({ projectName: 1, dateStr: 1 }, { unique: true });
workStatusSchema.index({ date: -1, projectName: 1 });
workStatusSchema.index({ clientName: 1 });

const WorkStatus = mongoose.model("WorkStatus", workStatusSchema);

export default WorkStatus;
