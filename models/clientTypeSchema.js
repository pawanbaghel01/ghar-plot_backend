import mongoose from "mongoose";

const clientTypeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["clientType", "sourceType", "propertySellerType"],
      required: true,
      default: "clientType",
    },
  },
  { timestamps: true }
);

export default mongoose.model("ClientType", clientTypeSchema);
