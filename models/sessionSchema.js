import mongoose from "mongoose";

const sessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin", required: true },
  token: { type: String, required: true },
  device: { type: String },
  ip: { type: String },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

export default mongoose.model("Session", sessionSchema);
