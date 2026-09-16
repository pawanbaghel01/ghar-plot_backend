import mongoose from "mongoose";

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    contactNumber: {
      type: String,
      required: true,
      trim: true,
    },

    comments: {
      type: String,
      default: "",
      trim: true,
    },

    // Ref to ClientType where category === "sourceType"
    source: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientType",
      default: null,
    },

    // Ref to ClientType where category === "clientType"
    clientType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientType",
      default: null,
    },

    status: {
      type: String,
      enum: ["New", "Follow Up", "Converted", "Closed", "Lost"],
      default: "New",
      trim: true,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Employee",
      default: null,
    },

    // Optional — only relevant when client is a property seller
    propertySellerType: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ClientType", // category === "propertySellerType"
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes for common query patterns
clientSchema.index({ assignedTo: 1 });
clientSchema.index({ status: 1 });
clientSchema.index({ clientType: 1 });

export default mongoose.model("Client", clientSchema);
