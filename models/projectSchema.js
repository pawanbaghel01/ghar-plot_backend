import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectName: {
      type: String,
      required: true,
      trim: true,
    },

    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive", "Completed", "Complete", "In Progress", "On Hold", "Cancelled"],
      default: "Active",
      trim: true,
    },
  },
  { timestamps: true }
);

projectSchema.index({ client: 1 });
projectSchema.index({ status: 1 });

export default mongoose.model("Project", projectSchema);
