import mongoose from "mongoose";

//  Define message sub-schema
const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
    isRead: {
      type: Boolean,
      default: false, //  used for read receipts
    },
    createdAt: {
      type: Date,
      default: Date.now, //  consistent message timestamp
    },
  },
  { _id: false } // prevent extra _id for each sub-message
);

//  Define chat schema
const chatSchema = new mongoose.Schema(
  {
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],
    messages: [messageSchema],
  },
  { timestamps: true } // adds createdAt & updatedAt for chat
);

//  Index for faster chat lookup between users
chatSchema.index({ participants: 1 });

export default mongoose.model("Chat", chatSchema);
