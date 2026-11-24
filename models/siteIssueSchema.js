import mongoose from "mongoose";

const siteIssueSchema = new mongoose.Schema(
  {
    issueCode: {
      type: String,
      unique: true,
      index: true,
    },
    businessAssociate: {
      type: String,
      required: true,
      trim: true,
      default: "admin",
      index: true,
    },
    clientName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    projectName: {
      type: String,
      trim: true,
      default: "",
      index: true,
    },
    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    report: {
      type: String,
      required: true,
      trim: true,
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
    status: {
      type: String,
      enum: ["Open", "In Progress", "Resolved"],
      default: "Open",
    },
  },
  { timestamps: true }
);

export default mongoose.model("SiteIssue", siteIssueSchema);
