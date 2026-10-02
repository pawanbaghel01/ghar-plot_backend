import mongoose from "mongoose";

const inquirySchema = new mongoose.Schema(
  {
    //  Existing Fields
    propertyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Property",
      required: true,
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
      required: true,
      match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address"],
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
