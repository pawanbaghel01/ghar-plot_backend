import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    // Property Reference & Unique Custom ID (e.g. CL01P1)
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
    },
    customPropertyId: {
      type: String,
      trim: true,
      default: "",
    },

    buyerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: false,
      default: "",
      validate: {
        validator: function (v) {
          if (!v) return true;
          return /^\S+@\S+\.\S+$/.test(v);
        },
        message: "Please enter a valid email address",
      },
    },
    contactNumber: {
      type: String,
      required: true,
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

export default mongoose.model("Inquiry", inquirySchema);
