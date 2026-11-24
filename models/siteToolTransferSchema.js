import mongoose from "mongoose";

const siteToolTransferSchema = new mongoose.Schema(
  {
    transferCode: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    toolId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SiteTool",
      required: true,
      index: true,
    },
    toolCode: {
      type: String,
      required: true,
      index: true,
    },
    toolName: {
      type: String,
      required: true,
      trim: true,
    },
    businessAssociate: {
      type: String,
      required: true,
      trim: true,
    },
    assignedAgent: {
      type: String,
      required: true,
      trim: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
    },
    transferDate: {
      type: Date,
      default: Date.now,
      index: true,
    },
    dateStr: {
      type: String,
      trim: true,
      default: "",
    },
    status: {
      type: String,
      enum: ["Verified", "Pending", "Returned"],
      default: "Verified",
    },
    remarks: {
      type: String,
      trim: true,
      default: "",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SiteToolTransfer", siteToolTransferSchema);
