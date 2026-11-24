import mongoose from "mongoose";

const siteToolSchema = new mongoose.Schema(
  {
    toolCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    businessAssociate: {
      type: String,
      required: true,
      trim: true,
      default: "admin",
      index: true,
    },
    totalQty: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    usedQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    transferredQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    closingQty: {
      type: Number,
      min: 0,
      default: 0,
    },
    date: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dateStr: {
      type: String,
      trim: true,
      default: "",
    },
    details: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Active", "Maintenance", "Disposed"],
      default: "Active",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SiteTool", siteToolSchema);
